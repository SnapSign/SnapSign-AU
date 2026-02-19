// firebase-functions v7: use v2 API (gen2 Cloud Functions).
// onCall handlers receive a single request object; we destructure as ({ data, ...context })
// so helpers that access context.auth keep working unchanged.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { isProFlagEnabled } = require('./lib/entitlement');
const { normalizeObjectKey, assertUserScopedKey } = require('./lib/storage-access');
const geminiClient = require('./lib/gemini-client');
const { getGeminiModel } = geminiClient;
const { buildAnalysisPrompt, buildExplanationPrompt, buildRiskPrompt, buildTranslationPrompt, buildTypeSpecificPrompt } = require('./lib/prompts');
const { analysisSchema, explanationSchema, riskAssessmentSchema, translationSchema, typeSpecificSchema } = require('./lib/analysis-schema');

// In production on Firebase, Admin SDK uses application default credentials automatically.
// For local development (emulators), we optionally bootstrap with a service account JSON file.
const initAdmin = () => {
  const isEmulator =
    !!process.env.FUNCTIONS_EMULATOR ||
    !!process.env.FIREBASE_EMULATOR_HUB ||
    !!process.env.FIRESTORE_EMULATOR_HOST;

  // Prefer GOOGLE_APPLICATION_CREDENTIALS if the developer set it.
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // Convenience: if running locally and the repo has a downloaded service account in /functions,
  // use it without requiring extra env wiring.
  const bundledPath = path.join(__dirname, 'snapsign-au-firebase-adminsdk-zfdkg-b70731eac2.json');

  const credentialsPath =
    (envPath && envPath.trim()) ? envPath.trim() : (isEmulator && fs.existsSync(bundledPath) ? bundledPath : null);

  if (credentialsPath && fs.existsSync(credentialsPath)) {
    const raw = fs.readFileSync(credentialsPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
};

if (admin.apps.length === 0) {
  initAdmin();
}

const db = admin.firestore();

const ADMIN_EMAIL_DOMAIN = '@snapsign.com.au';
const ADMIN_CONFIG_DOC_IDS = ['stripe', 'plans', 'flags', 'policies'];

// Configuration constants
const CONFIG = {
  // Scan detection
  MIN_CHARS_PER_PAGE: 30,
  SCAN_RATIO_THRESHOLD: 0.20,

  // Safety limits (hard caps; configurable later via Firestore admin_constants)
  FREE_MAX_TOTAL_CHARS: 120000,

  // Token budgets (authoritative spec lives in decodocs/docs/SUBSCRIPTION_TIERS.md)
  ANON_TOKENS_PER_UID: 20000,
  FREE_TOKENS_PER_DAY: 40000,

  // Retention for rolling usage docs (docHash ledger is forever; see decodocs/docs/SUBSCRIPTION_TIERS.md)
  TTL_DAYS_USAGE_DOCS: 30,
};

const ADMIN_AI_EVENTS_COLLECTION = 'admin_ai_events';
const ADMIN_REPORTS_COLLECTION = 'admin_reports';
const DEFAULT_GEMINI_MODEL_NAME = 'gemini-2.5-flash';

// Function to validate auth context
const validateAuth = (context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication is required for this operation.'
    );
  }
  return context.auth.uid;
};

const isSnapsignAdminEmail = (email) =>
  typeof email === 'string' && email.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN);

const validateAdminContext = (context) => {
  const uid = validateAuth(context);
  const email = context?.auth?.token?.email || '';
  if (!isSnapsignAdminEmail(email)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access requires a @snapsign.com.au account.'
    );
  }
  return { uid, email };
};

const ensurePlainObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const assertStringPrefix = (errors, value, pathLabel, prefix) => {
  if (value === undefined) return;
  if (typeof value !== 'string' || !value.startsWith(prefix)) {
    errors.push(`${pathLabel} must be a string starting with "${prefix}"`);
  }
};

const assertHttpUrl = (errors, value, pathLabel) => {
  if (value === undefined) return;
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
    errors.push(`${pathLabel} must be a valid http(s) URL`);
  }
};

const validateStringMap = ({ errors, value, pathLabel, requiredPrefix = null }) => {
  if (value === undefined) return;
  if (!ensurePlainObject(value)) {
    errors.push(`${pathLabel} must be an object`);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      errors.push(`${pathLabel}.${k} must be a non-empty string`);
      continue;
    }
    if (requiredPrefix && !v.startsWith(requiredPrefix)) {
      errors.push(`${pathLabel}.${k} must start with "${requiredPrefix}"`);
    }
  }
};

const validateStripeModeConfig = (errors, modeCfg, label) => {
  if (modeCfg === undefined) return;
  if (!ensurePlainObject(modeCfg)) {
    errors.push(`${label} must be an object`);
    return;
  }
  assertStringPrefix(errors, modeCfg.apiKey, `${label}.apiKey`, 'sk_');
  assertStringPrefix(errors, modeCfg.publishableKey, `${label}.publishableKey`, 'pk_');
  assertStringPrefix(errors, modeCfg.webhookSecret, `${label}.webhookSecret`, 'whsec_');
  validateStringMap({ errors, value: modeCfg.productIds, pathLabel: `${label}.productIds`, requiredPrefix: 'prod_' });
  validateStringMap({ errors, value: modeCfg.priceIds, pathLabel: `${label}.priceIds`, requiredPrefix: 'price_' });
};

const validateAdminConfigPayload = ({ qpath, data }) => {
  const errors = [];
  if (!ensurePlainObject(data)) {
    errors.push('data must be a JSON object');
    return errors;
  }

  if (qpath === 'admin/stripe') {
    if (data.mode !== undefined && data.mode !== 'test' && data.mode !== 'prod') {
      errors.push('mode must be "test" or "prod"');
    }
    assertHttpUrl(errors, data.successUrl, 'successUrl');
    assertHttpUrl(errors, data.cancelUrl, 'cancelUrl');
    assertHttpUrl(errors, data.portalReturnUrl, 'portalReturnUrl');

    // Backward-compatible flat fields.
    assertStringPrefix(errors, data.apiKey, 'apiKey', 'sk_');
    assertStringPrefix(errors, data.publishableKey, 'publishableKey', 'pk_');
    assertStringPrefix(errors, data.webhookSecret, 'webhookSecret', 'whsec_');
    validateStringMap({ errors, value: data.productIds, pathLabel: 'productIds', requiredPrefix: 'prod_' });
    validateStringMap({ errors, value: data.priceIds, pathLabel: 'priceIds', requiredPrefix: 'price_' });

    // Preferred mode-specific fields.
    validateStripeModeConfig(errors, data.test, 'test');
    validateStripeModeConfig(errors, data.prod, 'prod');
  } else if (qpath === 'admin/flags') {
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_') || k.endsWith('At')) continue;
      if (typeof v !== 'boolean') {
        errors.push(`${k} must be boolean`);
      }
    }
  } else if (qpath === 'admin/plans') {
    for (const [planName, planCfg] of Object.entries(data)) {
      if (planName.startsWith('_') || planName.endsWith('At')) continue;
      if (!ensurePlainObject(planCfg)) {
        errors.push(`${planName} must be an object`);
        continue;
      }
      for (const [k, v] of Object.entries(planCfg)) {
        if (k.endsWith('Enabled')) {
          if (typeof v !== 'boolean') errors.push(`${planName}.${k} must be boolean`);
          continue;
        }
        if (typeof v === 'number' && v < 0) {
          errors.push(`${planName}.${k} must be >= 0`);
        }
      }
    }
  } else if (qpath === 'admin/policies') {
    if (data.rateLimit !== undefined && !ensurePlainObject(data.rateLimit)) {
      errors.push('rateLimit must be an object');
    }
    if (ensurePlainObject(data.rateLimit) && data.rateLimit.perMinute !== undefined) {
      if (typeof data.rateLimit.perMinute !== 'number' || data.rateLimit.perMinute <= 0) {
        errors.push('rateLimit.perMinute must be a positive number');
      }
    }
  }

  return errors;
};

const getBearerToken = (req) => {
  const authHeader = req.get('authorization') || req.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
};

const validateAdminRequest = async (req) => {
  const token = getBearerToken(req);
  if (!token) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Missing Authorization header. Expected: Bearer <Firebase ID token>.'
    );
  }
  const decoded = await admin.auth().verifyIdToken(token);
  if (!isSnapsignAdminEmail(decoded?.email)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access requires a @snapsign.com.au account.'
    );
  }
  return decoded;
};

const getAuthFlags = (context) => {
  const token = context?.auth?.token || {};
  const provider = token?.firebase?.sign_in_provider;
  return {
    isAnonymous: provider === 'anonymous',
    signInProvider: provider || null,
  };
};

const resolvePuidForUid = async (uid) => {
  // MVP: puid == uid. Later: look up uid_aliases/{uid} => puid.
  return uid;
};

const getUserEntitlement = async (context) => {
  const uid = validateAuth(context);
  const { isAnonymous } = getAuthFlags(context);
  const puid = await resolvePuidForUid(uid);

  const userRef = db.collection('users').doc(puid);
  const userSnap = await userRef.get();

  const userData = userSnap.exists ? (userSnap.data() || {}) : {};
  const isPro = isProFlagEnabled(userData);

  const tier = isPro ? 'pro' : (isAnonymous ? 'anonymous' : 'free');

  // Ensure a minimal record exists for all users (including anonymous)
  if (!userSnap.exists) {
    await userRef.set(
      {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        isPro: false,
        subscription: { isPro: false },
      },
      { merge: true }
    );
  } else {
    await userRef.set({ lastSeenAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  return { uid, puid, tier, isPro };
};

const estimateTokensFromChars = (totalChars) => Math.max(0, Math.floor((totalChars || 0) / 4));

const getDayKey = () => {
  const d = new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`; // UTC day
};

const enforceAndRecordTokenUsage = async ({ puid, tier, estimatedTokens }) => {
  if (tier === 'pro') {
    return { allowed: true, remaining: null };
  }

  if (tier === 'anonymous') {
    const userRef = db.collection('users').doc(puid);
    const snap = await userRef.get();
    const used = snap.exists ? (snap.data()?.usage?.anonTokensUsed || 0) : 0;
    console.log(`DEBUG: enforceAndRecordTokenUsage ANON: used=${used} estimated=${estimatedTokens} limit=${CONFIG.ANON_TOKENS_PER_UID}`);

    if (used + estimatedTokens > CONFIG.ANON_TOKENS_PER_UID) {
      return { allowed: false, code: 'ANON_TOKEN_LIMIT', remaining: Math.max(0, CONFIG.ANON_TOKENS_PER_UID - used) };
    }

    await userRef.set(
      {
        usage: {
          anonTokensUsed: admin.firestore.FieldValue.increment(estimatedTokens),
        },
      },
      { merge: true }
    );

    return { allowed: true, remaining: Math.max(0, CONFIG.ANON_TOKENS_PER_UID - (used + estimatedTokens)) };
  }

  // tier === 'free'
  const dayKey = getDayKey();
  const ref = db.collection('usage_daily').doc(`${puid}_${dayKey}`);

  let used = 0;
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    used = doc.exists ? (doc.data()?.tokensUsed || 0) : 0;

    if (used + estimatedTokens > CONFIG.FREE_TOKENS_PER_DAY) {
      return;
    }

    tx.set(
      ref,
      {
        puid,
        dayKey,
        tokensUsed: admin.firestore.FieldValue.increment(estimatedTokens),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: doc.exists ? doc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  if (used + estimatedTokens > CONFIG.FREE_TOKENS_PER_DAY) {
    return { allowed: false, code: 'FREE_TOKEN_LIMIT', remaining: Math.max(0, CONFIG.FREE_TOKENS_PER_DAY - used) };
  }

  return { allowed: true, remaining: Math.max(0, CONFIG.FREE_TOKENS_PER_DAY - (used + estimatedTokens)) };
};

// Helper to validate document hash format
const validateDocHash = (docHash) => {
  if (!docHash || typeof docHash !== 'string' || !/^[a-f0-9]{64}$/.test(docHash)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Valid SHA-256 document hash (64 hex characters) is required.'
    );
  }
};

// Helper to compute scan ratio
const computeScanRatio = (charsPerPage, pageCount) => {
  if (!charsPerPage || charsPerPage.length === 0) return 0;

  const lowTextPages = charsPerPage.filter(chars => chars < CONFIG.MIN_CHARS_PER_PAGE).length;
  return pageCount > 0 ? lowTextPages / pageCount : 0;
};

// Helper to validate and repair output schema
const validateOutputSchema = (result) => {
  // Ensure required fields exist
  if (!result.plainExplanation) result.plainExplanation = "Unable to generate explanation";
  if (!result.risks) result.risks = [];
  if (!result.unfairConditions) result.unfairConditions = [];
  if (!result.inconsistencies) result.inconsistencies = [];
  if (!result.obligations) result.obligations = [];
  if (!result.missingInfo) result.missingInfo = [];

  // Validate risks schema
  result.risks = result.risks.map(risk => ({
    id: risk.id || `R${Date.now()}`,
    title: risk.title || risk.clause || "Unknown risk",
    severity: risk.severity || risk.riskLevel || "medium",
    whyItMatters: risk.whyItMatters || risk.description || "No description provided",
    whatToCheck: Array.isArray(risk.whatToCheck) ? risk.whatToCheck : [risk.recommendations || "Review carefully"],
    anchors: Array.isArray(risk.anchors) ? risk.anchors : []
  }));

  return result;
};

const safeString = (value, fallback = '') => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  if (value === null || value === undefined) return fallback;
  const asText = String(value).trim();
  return asText || fallback;
};

const getActiveGeminiModelName = () => {
  if (typeof geminiClient.getResolvedGeminiModelName === 'function') {
    return safeString(geminiClient.getResolvedGeminiModelName(), DEFAULT_GEMINI_MODEL_NAME);
  }
  return safeString(geminiClient.MODEL_NAME, DEFAULT_GEMINI_MODEL_NAME);
};

const logAdminAiEvent = async ({ eventType, payload }) => {
  await db.collection(ADMIN_AI_EVENTS_COLLECTION).add({
    eventType,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...payload,
  });
};

const redactSensitive = (key, value) => {
  const lowered = String(key || '').toLowerCase();
  const sensitiveFragments = ['text', 'content', 'selection', 'pdf', 'base64', 'raw'];
  if (sensitiveFragments.some((fragment) => lowered.includes(fragment))) {
    return '[REDACTED]';
  }
  return value;
};

const sanitizeReportValue = (value, depth = 0) => {
  if (depth > 4) return '[TRUNCATED]';
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.slice(0, 3000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeReportValue(item, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value).slice(0, 40)) {
      out[k] = sanitizeReportValue(redactSensitive(k, v), depth + 1);
    }
    return out;
  }
  return String(value).slice(0, 500);
};

const logAdminReport = async (report) => {
  await db.collection(ADMIN_REPORTS_COLLECTION).add({
    status: 'open',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...report,
  });
};

const logBackendException = async ({ functionName, error, context = null, input = null }) => {
  try {
    const token = context?.auth?.token || {};
    await logAdminReport({
      reportType: 'backend_exception',
      source: 'functions',
      severity: 'error',
      functionName: safeString(functionName, 'unknown'),
      message: safeString(error?.message, 'Unknown error'),
      code: safeString(error?.code, null),
      statusCode: Number.isFinite(Number(error?.status)) ? Number(error.status) : null,
      stack: safeString(error?.stack, '').slice(0, 6000),
      uid: context?.auth?.uid || null,
      email: token?.email || null,
      authProvider: token?.firebase?.sign_in_provider || null,
      input: sanitizeReportValue(input || null),
    });
  } catch (loggingError) {
    console.error('Failed to log backend exception:', loggingError);
  }
};

const normalizeReportKind = (kind) => {
  const normalized = String(kind || '').trim().toLowerCase();
  if (normalized === 'bug' || normalized === 'feedback') return normalized;
  return null;
};

// Preflight check function
exports.preflightCheck = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const uid = validateAuth(context);

    const { docHash, stats } = data;

    // Validate inputs
    validateDocHash(docHash);
    if (!stats || typeof stats !== 'object') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Stats object is required.'
      );
    }

    const { pageCount, charsPerPage, totalChars, pdfSizeBytes } = stats;

    if (!Array.isArray(charsPerPage) || pageCount === undefined) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Valid stats with charsPerPage array and pageCount are required.'
      );
    }

    // Compute scan ratio
    const scanRatio = computeScanRatio(charsPerPage, pageCount);

    const entitlement = await getUserEntitlement(context);

    // Determine classification
    let classification = 'OK';
    let requiredTier = entitlement.tier;
    let reasons = [];

    // Check if document is scanned
    if (scanRatio > CONFIG.SCAN_RATIO_THRESHOLD && entitlement.tier !== 'pro') {
      classification = 'PRO_REQUIRED';
      requiredTier = 'pro';
      reasons.push({
        code: 'SCAN_DETECTED',
        message: 'Scanned PDFs require OCR (Pro).'
      });
    }

    // Check size limits for non-Pro
    if (entitlement.tier !== 'pro' && totalChars > CONFIG.FREE_MAX_TOTAL_CHARS) {
      classification = 'PRO_REQUIRED';
      requiredTier = 'pro';
      reasons.push({
        code: 'SIZE_LIMIT_EXCEEDED',
        message: `Document too large (${totalChars} chars, limit ${CONFIG.FREE_MAX_TOTAL_CHARS}).`
      });
    }

    // Calculate estimated tokens (rough heuristic)
    const estimatedTokens = Math.floor(totalChars / 4);

    return {
      ok: true,
      classification,
      requiredTier,
      reasons,
      entitlement: {
        tier: entitlement.tier,
        isPro: entitlement.isPro,
      },
      stats: {
        scanRatio,
        estimatedTokens,
      },
    };

  } catch (error) {
    console.error('Preflight check error:', error);
    await logBackendException({
      functionName: 'preflightCheck',
      error,
      context,
      input: { docHash: data?.docHash, stats: data?.stats },
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'An error occurred during preflight check.'
    );
  }
});

// Analyze text function
exports.analyzeText = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const entitlement = await getUserEntitlement(context);

    // Enforce rate limit/quota before we do anything expensive
    const estimatedTokens = estimateTokensFromChars(data?.stats?.totalChars || 0);
    const budget = await enforceAndRecordTokenUsage({
      puid: entitlement.puid,
      tier: entitlement.tier,
      estimatedTokens,
    });

    if (!budget.allowed) {
      return {
        ok: false,
        code: budget.code,
        message: entitlement.tier === 'anonymous'
          ? 'Anonymous token limit reached. Create a free account to continue.'
          : 'Daily token limit reached. Upgrade to Pro to continue.',
        requiredTier: entitlement.tier === 'anonymous' ? 'free' : 'pro',
        usage: { estimatedTokens, remainingTokens: budget.remaining },
      };
    }

    const {
      docHash,
      stats,
      text,
      options = {}
    } = data;

    // Validate inputs
    validateDocHash(docHash);

    if (!text || !text.value) {
      throw new functions.https.HttpsError('invalid-argument', 'Text object with value is required.');
    }

    // Use the stripped text for analysis
    const strippedText = text.value;
    const model = await getGeminiModel();
    const prompt = buildAnalysisPrompt(strippedText, { documentType: options.documentType });

    // Call Gemini with structured output
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseSchema: analysisSchema,
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for factual analysis
      }
    });

    const analysisData = JSON.parse(result.response.text());
    const validatedAnalysis = validateOutputSchema(analysisData);

    // Record docHash ledger
    await db.collection('docshashes').doc(docHash).set(
      {
        docHash,
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenByPuid: entitlement.puid,
      },
      { merge: true }
    );

    // Log usage event
    await db.collection('usage_events').add({
      puid: entitlement.puid,
      uid: entitlement.uid,
      tier: entitlement.tier,
      docHash: docHash,
      event: 'analyze',
      at: admin.firestore.FieldValue.serverTimestamp(),
      meta: { estimatedTokens, provider: 'gemini' }
    });

    return {
      ok: true,
      docHash,
      result: validatedAnalysis,
      usage: {
        estimatedTokens,
        remainingTokens: budget.remaining,
      },
      entitlement: {
        tier: entitlement.tier,
        isPro: entitlement.isPro,
      },
    };

  } catch (error) {
    console.error('Analyze text error:', error);
    console.error('DEBUG: Original error detail:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    await logBackendException({
      functionName: 'analyzeText',
      error,
      context,
      input: { docHash: data?.docHash, stats: data?.stats, options: data?.options },
    });
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'An error occurred during text analysis.');
  }
});

// Explain legal selection in plain English
exports.explainSelection = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const entitlement = await getUserEntitlement(context);
    const { docHash, selection, documentContext } = data;

    if (!selection) throw new functions.https.HttpsError('invalid-argument', 'Selection text is required');

    // Estimate tokens (small for selection)
    const estimatedTokens = Math.ceil(selection.length / 4) + 500; //    // Enforce token budgets (per uid/puid) same as analyzeText.
    console.log(`DEBUG: analyzeText calling enforce. tier=${entitlement.tier} puid=${entitlement.puid}`);
    const budget = await enforceAndRecordTokenUsage({
      puid: entitlement.puid,
      tier: entitlement.tier,
      estimatedTokens,
    });
    console.log(`DEBUG: analyzeText budget result:`, JSON.stringify(budget));

    if (!budget.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', 'Token limit reached');
    }

    const model = await getGeminiModel();
    const prompt = buildExplanationPrompt(selection, documentContext);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseSchema: explanationSchema,
        responseMimeType: 'application/json'
      }
    });

    const explanation = JSON.parse(result.response.text());

    return {
      ok: true,
      explanation,
      usage: { remainingTokens: budget.remaining }
    };

  } catch (error) {
    console.error('Explain selection error:', error);
    await logBackendException({
      functionName: 'explainSelection',
      error,
      context,
      input: { docHash: data?.docHash, hasDocumentContext: !!data?.documentContext },
    });
    throw new functions.https.HttpsError('internal', 'Failed to explain selection');
  }
});

// Highlight risks in the document
exports.highlightRisks = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const entitlement = await getUserEntitlement(context);
    const { docHash, documentText, documentType } = data;

    if (!documentText) throw new functions.https.HttpsError('invalid-argument', 'Document text is required');

    const estimatedTokens = Math.floor(documentText.length / 4);
    const budget = await enforceAndRecordTokenUsage({
      puid: entitlement.puid,
      tier: entitlement.tier,
      estimatedTokens,
    });

    if (!budget.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', 'Token limit reached');
    }

    const model = await getGeminiModel();
    const prompt = buildRiskPrompt(documentText, documentType);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseSchema: riskAssessmentSchema,
        responseMimeType: 'application/json'
      }
    });

    const risks = JSON.parse(result.response.text());

    return {
      ok: true,
      risks,
      usage: { remainingTokens: budget.remaining }
    };

  } catch (error) {
    console.error('Highlight risks error:', error);
    await logBackendException({
      functionName: 'highlightRisks',
      error,
      context,
      input: { docHash: data?.docHash, documentType: data?.documentType },
    });
    throw new functions.https.HttpsError('internal', 'Failed to analyze risks');
  }
});

// Translate legal text to plain English
exports.translateToPlainEnglish = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const entitlement = await getUserEntitlement(context);
    const { docHash, legalText } = data;

    if (!legalText) throw new functions.https.HttpsError('invalid-argument', 'Legal text is required');

    const estimatedTokens = Math.floor(legalText.length / 4);
    const budget = await enforceAndRecordTokenUsage({
      puid: entitlement.puid,
      tier: entitlement.tier,
      estimatedTokens,
    });

    if (!budget.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', 'Token limit reached');
    }

    const model = await getGeminiModel();
    const prompt = buildTranslationPrompt(legalText);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseSchema: translationSchema,
        responseMimeType: 'application/json'
      }
    });

    const translation = JSON.parse(result.response.text());

    return {
      ok: true,
      translation,
      usage: { remainingTokens: budget.remaining }
    };

  } catch (error) {
    console.error('Translate error:', error);
    await logBackendException({
      functionName: 'translateToPlainEnglish',
      error,
      context,
      input: { docHash: data?.docHash },
    });
    throw new functions.https.HttpsError('internal', 'Failed to translate text');
  }
});

// Get entitlement function
exports.getEntitlement = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const e = await getUserEntitlement(context);

    const entitlements = {
      tier: e.tier, // anonymous | free | pro
      isPro: e.isPro,

      // Feature flags
      storageEnabled: e.tier === 'pro',
      ocrEnabled: e.tier === 'pro',

      // Budgets
      anonTokensPerUid: CONFIG.ANON_TOKENS_PER_UID,
      freeTokensPerDay: CONFIG.FREE_TOKENS_PER_DAY,
    };

    return entitlements;
  } catch (error) {
    console.error('Get entitlement error:', error);
    await logBackendException({
      functionName: 'getEntitlement',
      error,
      context,
      input: null,
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while fetching entitlements.'
    );
  }
});

// Public report intake from web UI (feedback + bug reports).
exports.submitUserReport = functions.https.onCall(async ({ data, ...context }) => {
  const kind = normalizeReportKind(data?.kind);
  if (!kind) {
    throw new functions.https.HttpsError('invalid-argument', 'kind must be "feedback" or "bug"');
  }

  const message = safeString(data?.message, '');
  if (message.length < 8) {
    throw new functions.https.HttpsError('invalid-argument', 'message must be at least 8 characters');
  }
  if (message.length > 5000) {
    throw new functions.https.HttpsError('invalid-argument', 'message is too long');
  }

  const pageUrl = safeString(data?.pageUrl, '');
  const userAgent = safeString(data?.userAgent, '');
  const extra = sanitizeReportValue(data?.extra || null);
  const token = context?.auth?.token || {};

  const reportType = kind === 'bug' ? 'user_bug' : 'user_feedback';
  await logAdminReport({
    reportType,
    source: 'web',
    severity: kind === 'bug' ? 'warning' : 'info',
    functionName: 'submitUserReport',
    message,
    pageUrl: pageUrl || null,
    userAgent: userAgent || null,
    uid: context?.auth?.uid || null,
    email: token?.email || null,
    authProvider: token?.firebase?.sign_in_provider || null,
    input: extra,
  });

  return { ok: true };
});

// --- MinIO / S3 (Firestore-backed config, no env secrets) ---

/**
 * Load storage config from Firestore admin/minio.
 *
 * Document structure:
 *   mode: "test" | "prod"
 *   endpoint, bucket, region, forcePathStyle    <- shared
 *   prod: { accessKey, secretKey }
 *   test: { accessKey, secretKey }              <- optional
 *
 * Returns a flat config for active mode + `_mode`.
 */
const getStorageAdminConfig = async () => {
  const snap = await db.collection('admin').doc('minio').get();
  if (!snap.exists) return null;

  const doc = snap.data();
  const mode = String(doc.mode || 'prod');
  const modeConfig = doc[mode] || {};

  return {
    endpoint: doc.endpoint || null,
    bucket: doc.bucket || null,
    region: doc.region || 'us-east-1',
    forcePathStyle: doc.forcePathStyle !== false,
    ...modeConfig,
    _mode: mode,
  };
};

const getStorageClient = (storageCfg) => {
  const endpoint = String(storageCfg?.endpoint || '');
  const bucket = String(storageCfg?.bucket || '');
  const accessKey = String(storageCfg?.accessKey || '');
  const secretKey = String(storageCfg?.secretKey || '');
  const region = String(storageCfg?.region || 'us-east-1');
  const forcePathStyle = storageCfg?.forcePathStyle !== false;

  if (!/^https?:\/\//.test(endpoint)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Storage endpoint is missing in Firestore admin/minio.endpoint'
    );
  }
  if (!bucket) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Storage bucket is missing in Firestore admin/minio.bucket'
    );
  }
  if (!accessKey || !secretKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Storage credentials are missing in Firestore admin/minio.<mode>'
    );
  }

  return {
    s3: new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    }),
    endpoint,
    bucket,
    region,
  };
};

const ensureProStorageAccess = (entitlement) => {
  if (!entitlement?.isPro && entitlement?.tier !== 'pro') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Storage access requires a Pro subscription.'
    );
  }
};

// Callable: create a pre-signed PUT URL for direct upload to MinIO.
exports.storageCreateUploadUrl = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const entitlement = await getUserEntitlement(context);
    ensureProStorageAccess(entitlement);

    const storageCfg = await getStorageAdminConfig();
    const { s3, bucket, endpoint } = getStorageClient(storageCfg);

    const requestedKey = normalizeObjectKey(data?.key);
    const contentType = String(data?.contentType || 'application/octet-stream');
    const expiresIn = Math.min(Math.max(Number(data?.expiresIn || 300), 60), 3600);

    // Enforce per-user namespace to avoid cross-user key collisions/access.
    const key = requestedKey
      ? (requestedKey.startsWith(`${entitlement.puid}/`) ? requestedKey : `${entitlement.puid}/${requestedKey}`)
      : `${entitlement.puid}/uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.bin`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn });

    return {
      key,
      bucket,
      endpoint,
      method: 'PUT',
      contentType,
      expiresIn,
      url,
    };
  } catch (error) {
    await logBackendException({
      functionName: 'storageCreateUploadUrl',
      error,
      context,
      input: { key: data?.key || null, contentType: data?.contentType || null },
    });
    throw error;
  }
});

// Callable: create a pre-signed GET URL for direct download from MinIO.
exports.storageCreateDownloadUrl = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const entitlement = await getUserEntitlement(context);
    ensureProStorageAccess(entitlement);

    const storageCfg = await getStorageAdminConfig();
    const { s3, bucket, endpoint } = getStorageClient(storageCfg);

    const key = normalizeObjectKey(data?.key);
    if (!key) {
      throw new functions.https.HttpsError('invalid-argument', 'key is required');
    }
    if (!assertUserScopedKey(key, entitlement.puid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'key must be scoped to the authenticated user namespace'
      );
    }

    const expiresIn = Math.min(Math.max(Number(data?.expiresIn || 300), 60), 3600);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn });

    return {
      key,
      bucket,
      endpoint,
      method: 'GET',
      expiresIn,
      url,
    };
  } catch (error) {
    await logBackendException({
      functionName: 'storageCreateDownloadUrl',
      error,
      context,
      input: { key: data?.key || null, expiresIn: data?.expiresIn || null },
    });
    throw error;
  }
});

// --- Stripe (mock webhook + future real webhook) ---

const isEmulatorEnv = () =>
  !!process.env.FUNCTIONS_EMULATOR ||
  !!process.env.FIREBASE_EMULATOR_HUB ||
  !!process.env.FIRESTORE_EMULATOR_HOST;

/**
 * Load Stripe config from Firestore admin/stripe.
 *
 * Document structure:
 *   mode: "test" | "prod"           ← global switch
 *   successUrl, cancelUrl, portalReturnUrl  ← shared across modes
 *   test: { apiKey, publishableKey, productIds, priceIds, webhookSecret, mockWebhookSecret }
 *   prod: { apiKey, publishableKey, productIds, priceIds, webhookSecret }
 *
 * Returns a flat config merging shared fields + the active mode's sub-object,
 * plus a `_mode` field indicating which mode was selected.
 */
const getStripeAdminConfig = async () => {
  const snap = await db.collection('admin').doc('stripe').get();
  if (!snap.exists) return null;

  const doc = snap.data();
  const mode = String(doc.mode || 'test');

  // Mode-specific sub-object (test or prod)
  const modeConfig = doc[mode] || {};

  // Merge: shared fields first, then mode-specific overrides, then _mode tag
  return {
    successUrl: doc.successUrl || null,
    cancelUrl: doc.cancelUrl || null,
    portalReturnUrl: doc.portalReturnUrl || null,
    ...modeConfig,
    _mode: mode,
  };
};

const getStripeClient = (adminCfg) => {
  const apiKey = String(adminCfg?.apiKey || '');
  if (!apiKey.startsWith('sk_')) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe apiKey is missing in Firestore admin/stripe');
  }
  // Let the SDK use its pinned default API version (matches SDK types)
  return new Stripe(apiKey);
};

const isStripeProStatus = (status) => {
  // Keep it simple: Stripe webhook is authoritative; we treat active as Pro.
  // If you later want to treat trialing as Pro, add it here.
  return status === 'active';
};

// Callable: create a Stripe Checkout Session (Pro subscription)
exports.stripeCreateCheckoutSession = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const uid = validateAuth(context);
    const puid = await resolvePuidForUid(uid);

    const plan = String(data?.plan || 'pro').toLowerCase(); // pro | business
    const billing = String(data?.billing || 'monthly'); // monthly | annual
    const currency = String(data?.currency || 'usd').toLowerCase(); // usd | aud
    if (plan !== 'pro' && plan !== 'business') {
      throw new functions.https.HttpsError('invalid-argument', 'plan must be "pro" or "business"');
    }

    const adminCfg = await getStripeAdminConfig();
    const stripe = getStripeClient(adminCfg);

    const priceIds = adminCfg?.priceIds || {};
    const billingKey = billing === 'annual' ? 'annual' : 'monthly';
    // Currency suffix: "usd" is the default (no suffix), others get "_aud", "_eur", etc.
    const currencySuffix = currency === 'usd' ? '' : `_${currency}`;
    const priceIdKey = `${plan}_${billingKey}${currencySuffix}`;
    const priceId = priceIds[priceIdKey];
    if (!priceId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Missing price id in Firestore admin/stripe.priceIds.${priceIdKey}`
      );
    }

    const successUrl = String(adminCfg?.successUrl || 'http://localhost:5173/profile?stripe=success');
    const cancelUrl = String(adminCfg?.cancelUrl || 'http://localhost:5173/pricing?stripe=cancel');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: puid,
      metadata: {
        firebaseUid: uid,
        puid,
        plan,
        billing,
        currency,
      },
      subscription_data: {
        metadata: {
          firebaseUid: uid,
          puid,
          plan,
        },
      },
    });

    return { url: session.url, id: session.id };
  } catch (error) {
    await logBackendException({
      functionName: 'stripeCreateCheckoutSession',
      error,
      context,
      input: { plan: data?.plan || null, billing: data?.billing || null, currency: data?.currency || null },
    });
    throw error;
  }
});

// Callable: create a Stripe Customer Portal session (receipts + manage subscription)
exports.stripeCreatePortalSession = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const uid = validateAuth(context);
    const puid = await resolvePuidForUid(uid);

    const adminCfg = await getStripeAdminConfig();
    const stripe = getStripeClient(adminCfg);

    const userSnap = await db.collection('users').doc(puid).get();
    const customerId = userSnap.exists ? userSnap.data()?.subscription?.customerId : null;

    if (!customerId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe customerId found for this user');
    }

    const returnUrl = String(adminCfg?.portalReturnUrl || adminCfg?.successUrl || 'http://localhost:5173/profile');

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    await logBackendException({
      functionName: 'stripeCreatePortalSession',
      error,
      context,
      input: null,
    });
    throw error;
  }
});

const upsertStripeSubscriptionState = async ({ puid, stripeStatus, customerId, subscriptionId, eventType }) => {
  const isPro = isStripeProStatus(stripeStatus);

  await db.collection('users').doc(puid).set(
    {
      // Canonical entitlement flag consumed by getUserEntitlement.
      isPro,
      subscription: {
        provider: 'stripe',
        customerId: customerId || null,
        subscriptionId: subscriptionId || null,
        status: stripeStatus || null,
        isPro,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      // Helpful for debugging/migrations
      lastStripeEvent: {
        type: eventType || null,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  return { puid, isPro };
};

// POST /stripeWebhook
// Real Stripe webhook endpoint.
// - Validates signature using admin/stripe.webhookSecret (whsec_...)
// - Updates users/{puid}.subscription and isPro
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const adminCfg = await getStripeAdminConfig();
    const webhookSecret = String(adminCfg?.webhookSecret || '');
    if (!webhookSecret.startsWith('whsec_')) {
      res.status(500).send('Stripe webhookSecret missing (admin/stripe.webhookSecret)');
      return;
    }

    const stripe = getStripeClient(adminCfg);

    const sig = req.get('stripe-signature');
    if (!sig) {
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    // Firebase provides rawBody for signature verification.
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);

    const type = event.type;
    const obj = event.data?.object || {};

    // 1) Subscription events: rely on subscription.metadata.{puid|firebaseUid}
    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const stripeStatus = obj.status;
      const customerId = obj.customer;
      const subscriptionId = obj.id;
      const puidMeta = obj.metadata?.puid;
      const firebaseUid = obj.metadata?.firebaseUid;

      const puid = puidMeta || (firebaseUid ? await resolvePuidForUid(firebaseUid) : null);
      if (!puid) {
        res.status(400).send('Missing subscription metadata puid/firebaseUid');
        return;
      }

      const result = await upsertStripeSubscriptionState({ puid, stripeStatus, customerId, subscriptionId, eventType: type });
      res.status(200).json({ ok: true, ...result });
      return;
    }

    // 2) Checkout session completed: helpful for capturing customerId/subscriptionId early
    if (type === 'checkout.session.completed') {
      const customerId = obj.customer;
      const subscriptionId = obj.subscription;
      const puid = obj.client_reference_id || obj.metadata?.puid || (obj.metadata?.firebaseUid ? await resolvePuidForUid(obj.metadata.firebaseUid) : null);

      if (!puid) {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }

      await db.collection('users').doc(puid).set(
        {
          subscription: {
            provider: 'stripe',
            customerId: customerId || null,
            subscriptionId: subscriptionId || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          lastStripeEvent: {
            type,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );

      res.status(200).json({ ok: true, puid });
      return;
    }

    // Unhandled events: acknowledge to Stripe.
    res.status(200).json({ ok: true, ignored: true, type });
  } catch (e) {
    console.error('stripeWebhook error:', e);
    await logBackendException({
      functionName: 'stripeWebhook',
      error: e,
      input: { method: req.method, path: req.path, eventType: req.body?.type || null },
    });
    // Stripe expects non-2xx to retry. We should be strict.
    res.status(400).send(`Webhook Error: ${e.message}`);
  }
});

// POST /stripeWebhookMock
// - For local development: lets us simulate Stripe webhooks.
// - In non-emulator: requires x-mock-secret header matching admin/stripe.mockWebhookSecret.
exports.stripeWebhookMock = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const inEmu = isEmulatorEnv();
    const adminCfg = await getStripeAdminConfig();

    if (!inEmu) {
      const provided = String(req.get('x-mock-secret') || '');
      const expected = String(adminCfg?.mockWebhookSecret || '');
      if (!expected || provided !== expected) {
        res.status(403).json({ ok: false, error: 'Forbidden' });
        return;
      }
    }

    const event = req.body;
    const obj = event?.data?.object;

    const stripeStatus = obj?.status;
    const customerId = obj?.customer;
    const subscriptionId = obj?.id;
    const firebaseUid = obj?.metadata?.firebaseUid;

    if (!firebaseUid) {
      res.status(400).json({ ok: false, error: 'Missing metadata.firebaseUid' });
      return;
    }

    const puid = await resolvePuidForUid(firebaseUid);
    const result = await upsertStripeSubscriptionState({ puid, stripeStatus, customerId, subscriptionId, eventType: event?.type });

    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('stripeWebhookMock error:', e);
    await logBackendException({
      functionName: 'stripeWebhookMock',
      error: e,
      input: { method: req.method, path: req.path, eventType: req.body?.type || null },
    });
    res.status(500).json({ ok: false, error: e?.message || 'internal' });
  }
});

// TTL cleanup function (scheduled)
// Save per-user document type override (users are isolated)
// Stored by puid+docHash so different users can have different classifications.
exports.saveDocTypeOverride = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const { uid, puid } = await getUserEntitlement(context);

    const docHash = data?.docHash;
    const typeId = String(data?.typeId || '').trim();

    validateDocHash(docHash);
    if (!typeId || typeId.length > 80) {
      throw new functions.https.HttpsError('invalid-argument', 'typeId is required');
    }

    const ref = db.collection('doc_type_overrides').doc(`${puid}_${docHash}`);
    await ref.set(
      {
        puid,
        uid,
        docHash,
        typeId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true };
  } catch (error) {
    await logBackendException({
      functionName: 'saveDocTypeOverride',
      error,
      context,
      input: { docHash: data?.docHash || null, typeId: data?.typeId || null },
    });
    throw error;
  }
});

// Returns detected + override + effective document type state.
exports.getDocumentTypeState = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const { uid, puid } = await getUserEntitlement(context);

    const docHash = data?.docHash;
    validateDocHash(docHash);

    const overrideRef = db.collection('doc_type_overrides').doc(`${puid}_${docHash}`);
    const detectedRef = db.collection('doc_classifications').doc(docHash);

    const [overrideSnap, detectedSnap] = await Promise.all([overrideRef.get(), detectedRef.get()]);

    const overrideTypeId = overrideSnap.exists ? (overrideSnap.data()?.typeId || null) : null;
    const detected = detectedSnap.exists ? (detectedSnap.data() || null) : null;
    const detectedTypeId = detected?.typeId || null;

    const effectiveTypeId = overrideTypeId || detectedTypeId || null;

    return {
      ok: true,
      uid,
      puid,
      docHash,
      overrideTypeId,
      detected,
      effectiveTypeId,
    };
  } catch (error) {
    await logBackendException({
      functionName: 'getDocumentTypeState',
      error,
      context,
      input: { docHash: data?.docHash || null },
    });
    throw error;
  }
});

// Cheap (non-AI) document type detection to seed routing; can be replaced by LLM later.
const VALIDATION_SPEC_BASE_URL =
  process.env.DECODOCS_VALIDATION_SPEC_BASE_URL ||
  'https://raw.githubusercontent.com/MaxSmile/decadocs/main/web/public/classifications/validation';

const DOCUMENT_TYPES_INDEX_URL =
  process.env.DECODOCS_DOCUMENT_TYPES_INDEX_URL ||
  'https://raw.githubusercontent.com/MaxSmile/decadocs/main/web/public/classifications/document-types.index.json';

const _validationSpecCache = new Map();
const getValidationSpec = async (validationSlug) => {
  if (!validationSlug) return null;

  const now = Date.now();
  const cached = _validationSpecCache.get(validationSlug);
  if (cached && cached.expiresAtMs > now) return cached.value;

  const url = `${VALIDATION_SPEC_BASE_URL}/${encodeURIComponent(validationSlug)}.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch validation spec (${validationSlug}): ${resp.status}`);
  const json = await resp.json();

  _validationSpecCache.set(validationSlug, { value: json, expiresAtMs: now + 5 * 60 * 1000 });
  return json;
};

let _documentTypesIndexCache = { value: null, expiresAtMs: 0 };
const getDocumentTypesIndex = async () => {
  const now = Date.now();
  if (_documentTypesIndexCache.value && _documentTypesIndexCache.expiresAtMs > now) {
    return _documentTypesIndexCache.value;
  }

  const resp = await fetch(DOCUMENT_TYPES_INDEX_URL);
  if (!resp.ok) throw new Error(`Failed to fetch document types index: ${resp.status}`);
  const json = await resp.json();

  const types = Array.isArray(json?.types) ? json.types : null;
  if (!types) throw new Error('Invalid document-types.index.json (missing types)');

  _documentTypesIndexCache = { value: { ...json, types }, expiresAtMs: now + 5 * 60 * 1000 };
  return _documentTypesIndexCache.value;
};

exports.detectDocumentType = functions.https.onCall(async ({ data, ...context }) => {
  try {
    const { uid, puid, tier } = await getUserEntitlement(context);

    const docHash = data?.docHash;
    validateDocHash(docHash);

    const stats = data?.stats || {};
    const pageCount = stats?.pageCount || 0;
    const charsPerPage = Array.isArray(stats?.charsPerPage) ? stats.charsPerPage : [];
    const totalChars = stats?.totalChars || 0;

    const rawText = String(data?.text || '');
    const text = rawText.slice(0, 250000); // hard cap
    const lower = text.toLowerCase();

    const scanRatio = computeScanRatio(charsPerPage, pageCount);

    let intakeCategory = 'GENERAL';
    let typeId = null;
    let confidence = 0.35;
    let reasons = [];

    if (!text.trim() || totalChars < 20) {
      intakeCategory = 'UNREADABLE';
      typeId = 'unreadable_empty';
      confidence = 0.9;
      reasons.push({ code: 'NO_TEXT', detail: 'No extractable text' });
    } else if (scanRatio > CONFIG.SCAN_RATIO_THRESHOLD) {
      // scanned documents often need OCR; don’t pretend we know the exact type
      intakeCategory = 'GENERAL';
      typeId = 'unreadable_broken';
      confidence = 0.45;
      reasons.push({ code: 'SCAN_LIKELY', detail: `scanRatio=${scanRatio.toFixed(2)}` });
    } else if (/(\binvoice\b|\btax invoice\b|\babn\b|\bgst\b)/.test(lower)) {
      intakeCategory = 'BUSINESS_LEGAL';
      typeId = 'business_invoice';
      confidence = 0.75;
      reasons.push({ code: 'KEYWORDS', detail: 'invoice/tax invoice/gst' });
    } else if (/(\boffer letter\b|\bjob offer\b|\bwe are pleased to offer\b|\bcommencement date\b|\bremuneration\b)/.test(lower)) {
      intakeCategory = 'BUSINESS_LEGAL';
      typeId = 'legal_job_offer';
      confidence = 0.7;
      reasons.push({ code: 'KEYWORDS', detail: 'job offer/offer letter/remuneration' });
    } else if (/(\bsop\b|\bprocedure\b|\bwork instruction\b|\bstep\s+\d+\b)/.test(lower)) {
      intakeCategory = 'GENERAL';
      typeId = 'general_sop_procedure';
      confidence = 0.65;
      reasons.push({ code: 'KEYWORDS', detail: 'sop/procedure/work instruction' });
    } else if (/(\bprivacy policy\b|\bpersonal information\b|\bdata collection\b)/.test(lower)) {
      intakeCategory = 'BUSINESS_LEGAL';
      typeId = 'policy_privacy';
      confidence = 0.65;
      reasons.push({ code: 'KEYWORDS', detail: 'privacy policy/data collection' });
    } else {
      intakeCategory = 'GENERAL';
      typeId = 'legal_contract_generic';
      confidence = 0.4;
      reasons.push({ code: 'FALLBACK', detail: 'default fallback' });
    }

    const ref = db.collection('doc_classifications').doc(docHash);
    await ref.set(
      {
        docHash,
        intakeCategory,
        typeId,
        confidence,
        reasons,
        tier,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        model: 'heuristic-v1',
      },
      { merge: true }
    );

    return { ok: true, uid, puid, docHash, intakeCategory, typeId, confidence, reasons };
  } catch (error) {
    await logBackendException({
      functionName: 'detectDocumentType',
      error,
      context,
      input: { docHash: data?.docHash || null, stats: data?.stats || null },
    });
    throw error;
  }
});

// Type-specific analysis entrypoint.
// NOTE: currently returns validation spec + metadata (AI execution will be wired in next).
exports.analyzeByType = functions.https.onCall(async ({ data, ...context }) => {
  const { uid, puid, tier } = await getUserEntitlement(context);

  const docHash = data?.docHash;
  validateDocHash(docHash);

  const text = String(data?.text || '').slice(0, 250000);

  const estimatedTokens = estimateTokensFromChars(text.length);

  // Enforce token budgets (per uid/puid) same as analyzeText.
  const budget = await enforceAndRecordTokenUsage({
    puid,
    tier,
    estimatedTokens,
  });

  if (!budget.allowed) {
    return {
      ok: false,
      code: budget.code,
      message: tier === 'anonymous'
        ? 'Anonymous token limit reached. Create a free account to continue.'
        : 'Daily token limit reached. Upgrade to Pro to continue.',
      requiredTier: tier === 'anonymous' ? 'free' : 'pro',
      usage: {
        estimatedTokens,
        remainingTokens: budget.remaining,
      },
    };
  }

  // Resolve effective type server-side.
  const overrideRef = db.collection('doc_type_overrides').doc(`${puid}_${docHash}`);
  const detectedRef = db.collection('doc_classifications').doc(docHash);
  const [overrideSnap, detectedSnap] = await Promise.all([overrideRef.get(), detectedRef.get()]);

  const overrideTypeId = overrideSnap.exists ? (overrideSnap.data()?.typeId || null) : null;
  const detectedTypeId = detectedSnap.exists ? (detectedSnap.data()?.typeId || null) : null;
  const effectiveTypeId = overrideTypeId || detectedTypeId || null;

  // Prefer the generated document-types index (has validationSlug).
  let validationSlug = null;
  try {
    const idx = await getDocumentTypesIndex();
    const t = idx.types.find((x) => x.id === effectiveTypeId);
    validationSlug = t?.validationSlug || null;
  } catch (e) {
    console.warn('analyzeByType: could not load document types index', e);
  }

  let validationSpec = null;
  if (validationSlug) {
    try {
      validationSpec = await getValidationSpec(validationSlug);
    } catch (e) {
      console.warn('analyzeByType: could not load validation spec', e);
    }
  }

  const safeText = text;
  const lower = safeText.toLowerCase();

  // Call Gemini for type-specific analysis
  let result;
  let geminiModelName = getActiveGeminiModelName();
  try {
    const model = await getGeminiModel();
    geminiModelName = getActiveGeminiModelName();
    const prompt = buildTypeSpecificPrompt(safeText, effectiveTypeId || 'document', validationSpec);

    const geminiResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseSchema: typeSpecificSchema,
        responseMimeType: 'application/json',
        temperature: 0.1, // low temperature for structured extraction
      }
    });

    const rawData = JSON.parse(geminiResult.response.text());

    // Transform extracted array back to object for frontend
    const extractedObj = {};
    if (Array.isArray(rawData.extracted)) {
      rawData.extracted.forEach(item => {
        if (item.key) extractedObj[item.key] = item.value;
      });
    }

    result = {
      plainExplanation: rawData.plainExplanation,
      extracted: extractedObj,
      checks: rawData.checks || [],
    };
  } catch (error) {
    console.error('Gemini analyzeByType failed:', error);
    const rawMessage = safeString(error?.message, 'Unknown Gemini error');
    const publicMessage = `Analysis failed: Gemini (${geminiModelName}). Returning basic metadata.`;
    await logBackendException({
      functionName: 'analyzeByType',
      error,
      context,
      input: { docHash, effectiveTypeId, validationSlug },
    });

    try {
      await logAdminAiEvent({
        eventType: 'analyzeByType_error',
        payload: {
          provider: 'gemini',
          model: geminiModelName,
          severity: 'error',
          uid,
          puid,
          tier,
          docHash,
          effectiveTypeId: effectiveTypeId || null,
          validationSlug: validationSlug || null,
          message: rawMessage.slice(0, 4000),
          code: safeString(error?.code, null),
          status: Number.isFinite(Number(error?.status)) ? Number(error.status) : null,
        },
      });
    } catch (logError) {
      console.error('Failed to write analyzeByType error to Firestore:', logError);
    }

    // Fallback to basic result on error
    result = {
      plainExplanation: publicMessage,
      extracted: {},
      checks: [],
    };
  }

  // Usage event (optional logging)
  await db.collection('usage_events').add({
    puid,
    uid,
    tier,
    docHash,
    event: 'analyzeByType',
    at: admin.firestore.FieldValue.serverTimestamp(),
    meta: {
      estimatedTokens,
      effectiveTypeId,
      validationSlug,
    },
  });

  return {
    ok: true,
    uid,
    puid,
    tier,
    docHash,
    overrideTypeId,
    detectedTypeId,
    effectiveTypeId,
    validationSlug,
    validationSpec,
    result,
    stats: {
      textChars: text.length,
    },
    usage: {
      estimatedTokens,
      remainingTokens: budget.remaining,
    },
    message: 'Type-specific analysis performed by Gemini.',
  };
});

exports.cleanupOldUsageRecords = functions.scheduler.onSchedule('every day 01:00', {
  timeZone: 'Australia/Sydney',
}, async (event) => {
  try {
    // Delete usage records older than configured TTL days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.TTL_DAYS_USAGE_DOCS);

    // Query for old records (rolling daily usage docs only)
    const oldRecordsQuery = await db.collection('usage_daily')
      .where('updatedAt', '<', cutoffDate)
      .get();

    const batch = db.batch();
    let deletedCount = 0;

    oldRecordsQuery.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`Deleted ${deletedCount} old usage records`);
    } else {
      console.log('No old usage records to delete');
    }

    return null;
  } catch (error) {
    console.error('Cleanup error:', error);
    await logBackendException({
      functionName: 'cleanupOldUsageRecords',
      error,
      input: null,
    });
    throw error;
  }
});

// Callable admin config write with auth + schema checks.
exports.setAdminConfig = functions.https.onCall(async ({ data, ...context }) => {
  validateAdminContext(context);

  const docId = String(data?.docId || '').trim();
  if (!ADMIN_CONFIG_DOC_IDS.includes(docId)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `docId must be one of: ${ADMIN_CONFIG_DOC_IDS.join(', ')}`
    );
  }

  const payload = data?.config;
  if (!ensurePlainObject(payload)) {
    throw new functions.https.HttpsError('invalid-argument', 'config must be a JSON object');
  }

  const qpath = `admin/${docId}`;
  const validationErrors = validateAdminConfigPayload({ qpath, data: payload });
  if (validationErrors.length > 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Admin config validation failed',
      { errors: validationErrors, qpath }
    );
  }

  const shouldMerge = data?.merge !== false;
  const docRef = db.doc(qpath);
  await docRef.set(
    {
      ...payload,
      _updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: shouldMerge }
  );
  const snap = await docRef.get();

  return {
    ok: true,
    path: qpath,
    data: snap.data(),
  };
});

// ============================================================================
// DOCUMENT RETRIEVAL BY PATH (FOR DEBUGGING / ADMIN)
// ============================================================================
exports.getDocByPath = functions.https.onRequest(async (req, res) => {
  // Allow CORS for admin/dev tooling
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    await validateAdminRequest(req);
    const qpath = req.query.qpath;

    if (!qpath || typeof qpath !== "string") {
      return res.status(400).json({
        error: "Missing or invalid qpath parameter"
      });
    }

    // Security: Prevent reading from /constants collection
    const pathParts = qpath.split('/');
    if (pathParts.length > 0 && pathParts[0] === 'constants') {
      return res.status(403).json({
        error: "Access to constants collection is forbidden"
      });
    }

    const docRef = db.doc(qpath);
    const snap = await docRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        error: "Document not found",
        path: qpath
      });
    }

    return res.json({
      path: qpath,
      data: snap.data()
    });

  } catch (err) {
    console.error(err);
    await logBackendException({
      functionName: 'getDocByPath',
      error: err,
      input: { qpath: req?.query?.qpath || null },
    });
    if (err instanceof functions.https.HttpsError) {
      const httpCode = err.code === 'unauthenticated' ? 401 : (err.code === 'permission-denied' ? 403 : 400);
      return res.status(httpCode).json({
        error: err.message,
        details: err.details || null,
      });
    }
    return res.status(500).json({
      error: "Internal error"
    });
  }
});

// ============================================================================
// DOCUMENT WRITE BY PATH (FOR ADMIN CONFIG — e.g. Stripe keys/prices)
// ============================================================================
// POST /setDocByPath  { qpath: "admin/stripe", data: { apiKey: "sk_...", ... } }
// Security: only allows writes to approved admin paths.
exports.setDocByPath = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    await validateAdminRequest(req);
    const { qpath, data } = req.body || {};

    if (!qpath || typeof qpath !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid qpath parameter' });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Missing or invalid data object' });
    }

    // Whitelist: only allow writes to specific admin-managed paths
    const ALLOWED_PREFIXES = ['admin/'];
    const isAllowed = ALLOWED_PREFIXES.some((prefix) => qpath.startsWith(prefix));
    if (!isAllowed) {
      return res.status(403).json({
        error: `Writes are only allowed to paths starting with: ${ALLOWED_PREFIXES.join(', ')}`,
      });
    }

    // Block certain sensitive sub-paths
    const BLOCKED_PATHS = ['admin/secrets'];
    if (BLOCKED_PATHS.includes(qpath)) {
      return res.status(403).json({ error: 'Write to this path is blocked' });
    }

    // Validate path has even number of segments (collection/doc)
    const segments = qpath.split('/');
    if (segments.length % 2 !== 0) {
      return res.status(400).json({
        error: 'qpath must point to a document (even number of path segments), e.g. admin/stripe',
      });
    }

    const validationErrors = validateAdminConfigPayload({ qpath, data });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Admin config validation failed',
        details: validationErrors,
        path: qpath,
      });
    }

    // Merge-write so existing fields not in payload are preserved
    // merge defaults to true; pass "merge": false in body to overwrite entirely
    const shouldMerge = req.body.merge !== false;

    const docRef = db.doc(qpath);
    await docRef.set(
      {
        ...data,
        _updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: shouldMerge }
    );

    // Read back to confirm
    const snap = await docRef.get();

    return res.json({
      ok: true,
      path: qpath,
      data: snap.data(),
    });
  } catch (err) {
    console.error('setDocByPath error:', err);
    await logBackendException({
      functionName: 'setDocByPath',
      error: err,
      input: { qpath: req?.body?.qpath || null },
    });
    if (err instanceof functions.https.HttpsError) {
      const httpCode = err.code === 'unauthenticated' ? 401 : (err.code === 'permission-denied' ? 403 : 400);
      return res.status(httpCode).json({
        error: err.message,
        details: err.details || null,
      });
    }
    return res.status(500).json({ error: 'Internal error' });
  }
});
