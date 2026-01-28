const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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
  FREE_AI_CALLS_PER_DOC: 1,
  PRO_AI_CALLS_PER_DOC: 3,
  MIN_CHARS_PER_PAGE: 30,
  SCAN_RATIO_THRESHOLD: 0.20,
  FREE_MAX_TOTAL_CHARS: 120000,
  TTL_DAYS_USAGE_DOCS: 30
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

// Helper to get user's plan (for MVP, assuming all anonymous users are free)
const getUserPlan = (uid) => {
  // In a real implementation, this would look up the user's subscription status
  // For MVP, all anonymous users are considered free tier
  return 'free';
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
    
    // Get user's plan
    const plan = getUserPlan(uid);
    
    // Determine classification
    let classification = 'FREE_OK';
    let requiredPlan = 'free';
    let reasons = [];
    
    // Check if document is scanned
    if (scanRatio > CONFIG.SCAN_RATIO_THRESHOLD && plan === 'free') {
      classification = 'PRO_REQUIRED';
      requiredPlan = 'pro';
      reasons.push({
        code: 'SCAN_DETECTED',
        message: 'Scanned PDFs require OCR (Pro).'
      });
    }
    
    // Check size limits for free tier
    if (plan === 'free' && totalChars > CONFIG.FREE_MAX_TOTAL_CHARS) {
      classification = 'PRO_REQUIRED';
      requiredPlan = 'pro';
      reasons.push({
        code: 'SIZE_LIMIT_EXCEEDED',
        message: `Document too large for Free tier (${totalChars} chars, limit ${CONFIG.FREE_MAX_TOTAL_CHARS}).`
      });
    }
    
    // Calculate estimated tokens (rough heuristic)
    const estimatedTokens = Math.floor(totalChars / 4);
    
    return {
      ok: true,
      classification,
      requiredPlan,
      reasons,
      stats: {
        scanRatio,
        estimatedTokens
      }
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
    const uid = validateAuth(context);
    
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
    
    // Create document ID for usage tracking
    const usageDocId = `${uid}_${docHash}`;
    
    // Get or create usage document
    const usageDocRef = db.collection('usage_docs').doc(usageDocId);
    let usageDoc = await usageDocRef.get();
    
    // Get user's plan
    const plan = getUserPlan(uid);
    
    // Compute scan ratio from stats
    const scanRatio = computeScanRatio(charsPerPage || [], pageCount || 0);
    
    // Check if document exists in usage records
    let aiCallsUsed = 0;
    if (usageDoc.exists) {
      const usageData = usageDoc.data();
      aiCallsUsed = usageData.aiCallsUsed || 0;
      
      // Check AI call limits based on plan
      const aiCallsLimitPerDoc = plan === 'pro' ? CONFIG.PRO_AI_CALLS_PER_DOC : CONFIG.FREE_AI_CALLS_PER_DOC;
      
      if (aiCallsUsed >= aiCallsLimitPerDoc) {
        return {
          ok: false,
          code: 'AI_BUDGET_EXCEEDED_PRO_REQUIRED',
          message: 'AI call limit reached for this document',
          requiredPlan: plan === 'free' ? 'pro' : plan,
          usage: {
            aiCallsUsed,
            aiCallsRemaining: 0
          }
        };
      }
      
      // Check if scanned document with free account
      if (plan === 'free' && scanRatio > CONFIG.SCAN_RATIO_THRESHOLD) {
        // Update blocked reason
        await usageDocRef.update({
          blockedReason: 'scanned_document_free_tier',
          lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return {
          ok: false,
          code: 'SCAN_DETECTED_PRO_REQUIRED',
          message: 'Scanned PDFs require OCR (Pro).',
          requiredPlan: 'pro',
          usage: {
            aiCallsUsed,
            aiCallsRemaining: 0
          }
        };
      }
    } else {
      // Create new usage document
      await usageDocRef.set({
        uid: uid,
        docHash: docHash,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        plan: plan,
        aiCallsUsed: 0,
        aiTokensEstimated: 0,
        pageCount: pageCount || 0,
        scanRatio: scanRatio || 0,
        blockedReason: null
      });
    }
    
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
    
    // Update usage counts atomically
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(usageDocRef);
      if (!doc.exists) {
        throw new Error('Usage document does not exist');
      }
      
      const currentUsage = doc.data();
      transaction.update(usageDocRef, {
        aiCallsUsed: (currentUsage.aiCallsUsed || 0) + 1,
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        aiTokensEstimated: (currentUsage.aiTokensEstimated || 0) + Math.floor(totalChars / 4)
      });
    });
    
    // Add to usage events (optional logging)
    await db.collection('usage_events').add({
      uid: uid,
      docHash: docHash,
      event: 'analyze',
      at: admin.firestore.FieldValue.serverTimestamp(),
      meta: {
        tokens: Math.floor(totalChars / 4),
        scanRatio: scanRatio
      }
    });
    
    // Calculate remaining calls
    const aiCallsLimitPerDoc = plan === 'pro' ? CONFIG.PRO_AI_CALLS_PER_DOC : CONFIG.FREE_AI_CALLS_PER_DOC;
    const aiCallsRemaining = Math.max(0, aiCallsLimitPerDoc - ((aiCallsUsed || 0) + 1));
    
    return {
      ok: true,
      docHash,
      result: mockAnalysis,
      usage: {
        aiCallsUsed: (aiCallsUsed || 0) + 1,
        aiCallsRemaining
      }
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
    const uid = validateAuth(context);
    
    // Get user's plan
    const plan = getUserPlan(uid);
    
    // Define limits based on plan
    const aiCallsPerDocLimit = plan === 'pro' ? CONFIG.PRO_AI_CALLS_PER_DOC : CONFIG.FREE_AI_CALLS_PER_DOC;
    
    const entitlements = {
      plan: plan,
      aiCallsPerDocLimit,
      storageEnabled: plan !== 'free', // Storage only for Pro+
      ocrEnabled: plan !== 'free', // OCR only for Pro+
      maxDocumentSizeMB: plan === 'premium' ? 50 : plan === 'pro' ? 10 : 5
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

// TTL cleanup function (scheduled)
exports.cleanupOldUsageRecords = functions.pubsub.schedule('every 24 hours from 01:00 to 02:00')
  .timeZone('Australia/Sydney')
  .onRun(async (context) => {
    try {
      // Delete usage records older than configured TTL days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.TTL_DAYS_USAGE_DOCS);
      
      // Query for old records
      const oldRecordsQuery = await db.collection('usage_docs')
        .where('lastUsedAt', '<', cutoffDate)
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
