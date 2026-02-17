const { SchemaType } = require('@google/generative-ai');

/**
 * Schema for general document analysis
 */
const analysisSchema = {
    type: SchemaType.OBJECT,
    properties: {
        plainExplanation: {
            type: SchemaType.STRING,
            description: "A plain English summary of the document or section."
        },
        risks: {
            type: SchemaType.ARRAY,
            description: "List of identified risks in the document.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING },
                    severity: {
                        type: SchemaType.STRING,
                        enum: ["low", "medium", "high"],
                        description: "Severity level of the risk."
                    },
                    whyItMatters: { type: SchemaType.STRING },
                    whatToCheck: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                    },
                    anchors: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: "Text snippets related to this risk."
                    }
                },
                required: ["id", "title", "severity", "whyItMatters", "whatToCheck"]
            }
        },
        keyPoints: {
            type: SchemaType.ARRAY,
            description: "Key points extracted from the document.",
            items: { type: SchemaType.STRING }
        },
        missingClauses: {
            type: SchemaType.ARRAY,
            description: "Standard clauses that appear to be missing.",
            items: { type: SchemaType.STRING }
        }
    },
    required: ["plainExplanation", "risks"]
};

/**
 * Schema for simple explanation of a selection
 */
const explanationSchema = {
    type: SchemaType.OBJECT,
    properties: {
        plainExplanation: {
            type: SchemaType.STRING,
            description: "A clear, simple explanation of the selected text."
        },
        examples: {
            type: SchemaType.ARRAY,
            description: "Examples to illustrate the clause.",
            items: { type: SchemaType.STRING }
        },
        relatedConcepts: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
        }
    },
    required: ["plainExplanation"]
};

/**
 * Schema for risk assessment
 */
const riskAssessmentSchema = {
    type: SchemaType.OBJECT,
    properties: {
        summary: {
            type: SchemaType.OBJECT,
            properties: {
                totalRisks: { type: SchemaType.NUMBER },
                highRiskCount: { type: SchemaType.NUMBER },
                mediumRiskCount: { type: SchemaType.NUMBER },
                lowRiskCount: { type: SchemaType.NUMBER },
                overallRiskLevel: {
                    type: SchemaType.STRING,
                    enum: ["low", "medium", "high", "critical"]
                }
            },
            required: ["totalRisks", "overallRiskLevel"]
        },
        items: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING },
                    severity: {
                        type: SchemaType.STRING,
                        enum: ["low", "medium", "high"]
                    },
                    description: { type: SchemaType.STRING },
                    location: {
                        type: SchemaType.OBJECT,
                        properties: {
                            page: { type: SchemaType.NUMBER },
                            paragraph: { type: SchemaType.NUMBER },
                            excerpt: { type: SchemaType.STRING }
                        }
                    },
                    recommendation: { type: SchemaType.STRING }
                },
                required: ["id", "title", "severity", "description"]
            }
        }
    },
    required: ["summary", "items"]
};

/**
 * Schema for plain English translation
 */
const translationSchema = {
    type: SchemaType.OBJECT,
    properties: {
        originalText: { type: SchemaType.STRING },
        plainEnglishTranslation: { type: SchemaType.STRING },
        keyTermsDefined: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    term: { type: SchemaType.STRING },
                    definition: { type: SchemaType.STRING }
                }
            }
        }
    },
    required: ["originalText", "plainEnglishTranslation"]
};

/**
 * Schema for type-specific analysis
 */
const typeSpecificSchema = {
    type: SchemaType.OBJECT,
    properties: {
        plainExplanation: { type: SchemaType.STRING },
        extracted: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    key: { type: SchemaType.STRING },
                    value: { type: SchemaType.STRING }
                },
                required: ["key", "value"]
            }
        },
        checks: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.STRING },
                    ok: { type: SchemaType.BOOLEAN },
                    message: { type: SchemaType.STRING }
                },
                required: ["id", "ok", "message"]
            }
        }
    },
    required: ["plainExplanation", "extracted", "checks"]
};

module.exports = {
    analysisSchema,
    explanationSchema,
    riskAssessmentSchema,
    translationSchema,
    typeSpecificSchema
};
