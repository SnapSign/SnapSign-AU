const { GoogleGenerativeAI } = require('@google/generative-ai');
const functions = require('firebase-functions');

// Initialize Gemini API
// Note: We're using gemini-2.0-flash as recommended in the plan
const MODEL_NAME = 'gemini-2.0-flash';

let genAI = null;
let model = null;

/**
 * Initializes the Gemini client if not already initialized
 * @returns {Object} The Gemini model instance
 */
function getGeminiModel() {
    if (model) return model;

    const apiKey = functions.config().gemini?.key || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.warn('⚠️ Google API Key is missing! AI features will fail.');
        // In local development, we might want to return a mock or throw immediately
        // For now, we'll throw to ensure the developer knows config is missing
        throw new Error('Google API Key not configured. Run: firebase functions:config:set gemini.key="YOUR_KEY"');
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });

    console.log(`✅ Gemini Client Initialized (${MODEL_NAME})`);
    return model;
}

module.exports = {
    getGeminiModel,
    MODEL_NAME
};
