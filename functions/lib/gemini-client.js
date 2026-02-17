const { GoogleGenerativeAI } = require('@google/generative-ai');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Gemini API
// Default model can be overridden via GEMINI_MODEL or Firestore admin/gemini(.model).
const DEFAULT_MODEL_NAME = 'gemini-2.0-flash';
const MODEL_NAME = DEFAULT_MODEL_NAME;

let genAI = null;
let model = null;
let initPromise = null;
let resolvedModelName = DEFAULT_MODEL_NAME;

const asNonEmptyString = (value) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
};

const getFirestore = () => {
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
    return admin.firestore();
};

const getRuntimeConfigGeminiKey = () => {
    try {
        return asNonEmptyString(functions.config().gemini?.key);
    } catch (error) {
        // functions.config() may be unavailable in some local/test runtimes.
        return '';
    }
};

const getGeminiConfigFromFirestore = async () => {
    const db = getFirestore();
    const snap = await db.collection('admin').doc('gemini').get();
    if (!snap.exists) return null;

    const doc = snap.data() || {};
    const mode = asNonEmptyString(doc.mode);
    const modeConfig = mode && typeof doc[mode] === 'object' ? doc[mode] : null;

    return {
        key: asNonEmptyString(modeConfig?.key) || asNonEmptyString(doc.key),
        model: asNonEmptyString(process.env.GEMINI_MODEL)
            || asNonEmptyString(modeConfig?.model)
            || asNonEmptyString(doc.model)
            || DEFAULT_MODEL_NAME,
    };
};

const resolveGeminiConfig = async () => {
    const envKey = asNonEmptyString(process.env.GOOGLE_API_KEY);
    if (envKey) {
        return {
            key: envKey,
            model: asNonEmptyString(process.env.GEMINI_MODEL) || DEFAULT_MODEL_NAME,
            source: 'GOOGLE_API_KEY',
        };
    }

    const runtimeKey = getRuntimeConfigGeminiKey();
    if (runtimeKey) {
        return {
            key: runtimeKey,
            model: asNonEmptyString(process.env.GEMINI_MODEL) || DEFAULT_MODEL_NAME,
            source: 'functions.config().gemini.key',
        };
    }

    try {
        const firestoreCfg = await getGeminiConfigFromFirestore();
        if (firestoreCfg?.key) {
            return {
                key: firestoreCfg.key,
                model: firestoreCfg.model || DEFAULT_MODEL_NAME,
                source: 'Firestore admin/gemini.key (logical path /admin/gemini/key)',
            };
        }
    } catch (error) {
        console.warn('Failed to read Gemini config from Firestore admin/gemini:', error?.message || error);
    }

    return {
        key: '',
        model: asNonEmptyString(process.env.GEMINI_MODEL) || DEFAULT_MODEL_NAME,
        source: null,
    };
};

/**
 * Initializes the Gemini client if not already initialized
 * @returns {Object} The Gemini model instance
 */
async function getGeminiModel() {
    if (model) return model;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const cfg = await resolveGeminiConfig();
        const apiKey = cfg.key;
        resolvedModelName = cfg.model || DEFAULT_MODEL_NAME;

        if (!apiKey) {
            throw new Error(
                'Google API Key not configured. Set GOOGLE_API_KEY, functions.config().gemini.key, or Firestore admin/gemini.key (logical path /admin/gemini/key).'
            );
        }

        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: resolvedModelName });

        console.log(`Gemini client initialized (${resolvedModelName}) via ${cfg.source || 'unknown source'}`);
        return model;
    })();

    try {
        return await initPromise;
    } finally {
        initPromise = null;
    }
}

module.exports = {
    getGeminiModel,
    MODEL_NAME
};
