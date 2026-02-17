/**
 * Builds the main analysis prompt
 * @param {string} text - The document text
 * @param {Object} context - Additional context (doc type, etc.)
 */
function buildAnalysisPrompt(text, context = {}) {
  const docType = context.documentType || 'document';

  return `
    You are an expert legal AI assistant. Analyze the following ${docType} text.
    
    Your goal is to provide a comprehensive analysis that includes:
    1. A plain English explanation of what this document is about.
    2. A structured list of risks, particularly those that might be unfair or dangerous to the signing party.
    3. Key points that summarize the main obligations.
    4. Any standard clauses that appear to be missing for this type of document.

    Analyze strictly based on the text provided. Do not hallucinate clauses that are not there.
    
    DOCUMENT TEXT:
    "${text.substring(0, 30000)}" // Limit text length for safety
  `;
}

/**
 * Builds a prompt for explaining a specific selection
 * @param {string} selection - The selected text
 * @param {string} fullText - Context from the full document
 */
function buildExplanationPrompt(selection, fullText) {
  // Get some surrounding context if possible, or just use the selection
  const contextSnippet = fullText ? `\n\nCONTEXT FROM DOCUMENT:\n...${fullText.substring(0, 1000)}...` : '';

  return `
    Explain the following legal clause in simple, plain English. 
    Explain what it means, why it exists, and give a concrete example of how it applies.
    
    CLAUSE TO EXPLAIN:
    "${selection}"
    ${contextSnippet}
  `;
}

/**
 * Builds a prompt for high-level risk assessment
 * @param {string} text - The document text
 * @param {string} type - The document type (e.g., NDA, Contract)
 */
function buildRiskPrompt(text, type) {
  return `
    Analyze this ${type || 'document'} for critical risks. 
    Focus on:
    - Unbalanced liability clauses
    - Infinite indemnities
    - Unreasonable termination rights
    - Hidden fees or automatic renewals
    - Intellectual property rights transfers that are too broad

    Identify the specific location of these risks if possible.

    DOCUMENT TEXT:
    "${text.substring(0, 30000)}"
  `;
}

/**
 * Builds a prompt for translation to plain English
 * @param {string} text - The legal text to translate
 */
function buildTranslationPrompt(text) {
  return `
    Translate the following legal text into clear, modern, plain English.
    Keep the meaning exact but remove legalese (heretofore, whereas, notwithstanding).
    Break long sentences into shorter ones.
    
    LEGAL TEXT:
    "${text}"
  `;
}

/**
 * Builds a prompt for type-specific analysis validation
 * @param {string} text - The document text
 * @param {string} type - The document type
 * @param {Object} spec - The validation spec (optional)
 */
const { loadPrompt } = require('./prompt-loader');

// ...

/**
 * Builds a prompt for type-specific analysis validation
 * @param {string} text - The document text
 * @param {string} type - The document type ID
 * @param {Object} spec - The validation spec (optional)
 */
function buildTypeSpecificPrompt(text, type, spec) {
  // Load MDX prompt stack
  // type is expected to be a typeId like 'legal_job_offer'.
  // If it's a generic label or unknown, loadPrompt falls back to GENERAL_DOC_TYPE.
  const promptTemplate = loadPrompt(type);

  const specContext = spec
    ? `\nVALIDATION REQUIREMENTS:\n${JSON.stringify(spec, null, 2)}\n\nFollow these requirements to check the document.`
    : '';

  // The MDX template already contains instructions. We append specContext and the document text.
  return `
    ${promptTemplate}
    ${specContext}

    DOCUMENT TEXT:
    "${text.substring(0, 30000)}"
  `;
}

module.exports = {
  buildAnalysisPrompt,
  buildExplanationPrompt,
  buildRiskPrompt,
  buildTranslationPrompt,
  buildTypeSpecificPrompt
};
