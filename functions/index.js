const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

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

  admin.initializeApp();
};

initAdmin();

const db = admin.firestore();

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

  const isPro = !!(userSnap.exists && userSnap.data()?.subscription?.isPro);

  const tier = isPro ? 'pro' : (isAnonymous ? 'anonymous' : 'free');

  // Ensure a minimal record exists for all users (including anonymous)
  if (!userSnap.exists) {
    await userRef.set(
      {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
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

// Preflight check function
exports.preflightCheck = functions.https.onCall(async (data, context) => {
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
exports.analyzeText = functions.https.onCall(async (data, context) => {
  try {
    const entitlement = await getUserEntitlement(context);

    const { 
      docHash, 
      stats, 
      text, 
      options = {}
    } = data;
    
    // Validate inputs
    validateDocHash(docHash);
    
    if (!text || !text.value) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Text object with value is required.'
      );
    }
    
    const { pageCount, charsPerPage, totalChars, languageHint } = stats || {};
    const { format, value: strippedText } = text;
    
    if (!strippedText) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Stripped text content is required.'
      );
    }
    
    // Compute scan ratio from stats
    const scanRatio = computeScanRatio(charsPerPage || [], pageCount || 0);

    // Enforce OCR gating: scanned PDFs require Pro (no vision model for Free/Anonymous)
    if (scanRatio > CONFIG.SCAN_RATIO_THRESHOLD && entitlement.tier !== 'pro') {
      return {
        ok: false,
        code: 'SCAN_DETECTED_PRO_REQUIRED',
        message: 'Scanned PDFs require OCR (Pro).',
        requiredTier: 'pro',
      };
    }

    const estimatedTokens = estimateTokensFromChars(totalChars);

    // Enforce token budgets (per uid/puid)
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
        usage: {
          estimatedTokens,
          remainingTokens: budget.remaining,
        },
      };
    }

    // Record docHash ledger (forever retention) for all tiers
    await db.collection('docshashes').doc(docHash).set(
      {
        docHash,
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenByPuid: entitlement.puid,
      },
      { merge: true }
    );
    
    // Simulate calling the AI service (this would be your actual LLM call)
    // In a real implementation, this would call your AI service
    let mockAnalysis = {
      plainExplanation: "This document contains standard contractual terms that require careful review. The key areas to focus on include payment terms, termination clauses, and liability limitations.",
      risks: [
        {
          id: "R1",
          title: "Limitation of liability",
          severity: "high",
          whyItMatters: "This clause significantly limits the other party's liability, potentially leaving you exposed to significant losses.",
          whatToCheck: ["Consider negotiating broader liability coverage", "Define maximum liability amounts clearly"],
          anchors: [{ page: 7, quote: "under no circumstances shall the company be liable for any indirect, incidental, or consequential damages", confidence: 0.8 }]
        },
        {
          id: "R2", 
          title: "Automatic renewal",
          severity: "medium",
          whyItMatters: "The contract automatically renews unless cancelled 30 days before expiration.",
          whatToCheck: ["Set calendar reminders for renewal dates", "Understand cancellation procedures"],
          anchors: [{ page: 12, quote: "this agreement shall automatically renew for successive one-year terms", confidence: 0.7 }]
        }
      ],
      unfairConditions: [],
      inconsistencies: [],
      obligations: [
        {
          id: "O1",
          title: "Payment terms",
          description: "Payment required within 30 days of invoice date",
          deadline: null
        }
      ],
      missingInfo: [
        {
          id: "M1",
          category: "termination",
          description: "Specific procedures for termination by either party are not clearly defined"
        }
      ]
    };
    
    // Validate output schema
    mockAnalysis = validateOutputSchema(mockAnalysis);
    
    // Add to usage events (optional logging)
    await db.collection('usage_events').add({
      puid: entitlement.puid,
      uid: entitlement.uid,
      tier: entitlement.tier,
      docHash: docHash,
      event: 'analyze',
      at: admin.firestore.FieldValue.serverTimestamp(),
      meta: {
        estimatedTokens,
        scanRatio,
      }
    });

    return {
      ok: true,
      docHash,
      result: mockAnalysis,
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
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred during text analysis.'
    );
  }
});

// Get entitlement function
exports.getEntitlement = functions.https.onCall(async (data, context) => {
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

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while fetching entitlements.'
    );
  }
});

// --- Stripe (mock webhook + future real webhook) ---

const isEmulatorEnv = () =>
  !!process.env.FUNCTIONS_EMULATOR ||
  !!process.env.FIREBASE_EMULATOR_HUB ||
  !!process.env.FIRESTORE_EMULATOR_HOST;

const getStripeAdminConfig = async () => {
  const snap = await db.collection('admin').doc('stripe').get();
  return snap.exists ? snap.data() : null;
};

const getStripeClient = (adminCfg) => {
  const apiKey = String(adminCfg?.apiKey || '');
  if (!apiKey.startsWith('sk_')) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe apiKey is missing in Firestore admin/stripe');
  }
  return new Stripe(apiKey, {
    apiVersion: '2024-06-20',
  });
};

const isStripeProStatus = (status) => {
  // Keep it simple: Stripe webhook is authoritative; we treat active as Pro.
  // If you later want to treat trialing as Pro, add it here.
  return status === 'active';
};

// Callable: create a Stripe Checkout Session (Pro subscription)
exports.stripeCreateCheckoutSession = functions.https.onCall(async (data, context) => {
  const uid = validateAuth(context);
  const puid = await resolvePuidForUid(uid);

  const billing = String(data?.billing || 'monthly'); // monthly | annual

  const adminCfg = await getStripeAdminConfig();
  const stripe = getStripeClient(adminCfg);

  const priceIds = adminCfg?.priceIds || {};
  const priceId = billing === 'annual' ? priceIds.pro_annual : priceIds.pro_monthly;
  if (!priceId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Missing price id in Firestore admin/stripe.priceIds for selected billing interval'
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
      billing,
    },
    subscription_data: {
      metadata: {
        firebaseUid: uid,
        puid,
      },
    },
  });

  return { url: session.url, id: session.id };
});

// Callable: create a Stripe Customer Portal session (receipts + manage subscription)
exports.stripeCreatePortalSession = functions.https.onCall(async (data, context) => {
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
    const isPro = isStripeProStatus(stripeStatus);

    await db.collection('users').doc(puid).set(
      {
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
          type: event?.type || null,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    res.status(200).json({ ok: true, puid, isPro });
  } catch (e) {
    console.error('stripeWebhookMock error:', e);
    res.status(500).json({ ok: false, error: e?.message || 'internal' });
  }
});

// TTL cleanup function (scheduled)
exports.cleanupOldUsageRecords = functions.pubsub.schedule('every 24 hours from 01:00 to 02:00')
  .timeZone('Australia/Sydney')
  .onRun(async (context) => {
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
      throw error;
    }
  });
