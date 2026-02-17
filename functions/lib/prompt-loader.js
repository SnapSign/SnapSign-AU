const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const PROMPTS_DIR = path.resolve(__dirname, '../prompts/types');

/**
 * Loads and resolves a prompt for a given type ID.
 * Handles inheritance by merging sections from parent types.
 * 
 * @param {string} typeId - The document type ID (e.g., 'legal_job_offer')
 * @returns {string} The fully resolved prompt string
 */
function loadPrompt(typeId) {
    if (!typeId) {
        console.warn('No typeId provided to loadPrompt. Falling back to GENERAL_DOC_TYPE.');
        typeId = 'GENERAL_DOC_TYPE';
    }

    // Load the specific type file
    let filePath = path.join(PROMPTS_DIR, `${typeId}.mdx`);

    // Fallback if file doesn't exist
    if (!fs.existsSync(filePath)) {
        console.warn(`Prompt file for type '${typeId}' not found. Falling back to GENERAL_DOC_TYPE.`);
        typeId = 'GENERAL_DOC_TYPE';
        filePath = path.join(PROMPTS_DIR, `${typeId}.mdx`);
    }

    if (!fs.existsSync(filePath)) {
        throw new Error('Critical: GENERAL_DOC_TYPE.mdx not found.');
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(fileContent);
    const { inherits, version } = parsed.data;

    // Parse sections from current file
    const sections = parseSections(parsed.content);

    // If it inherits from another type, load parent and merge
    if (inherits && inherits !== typeId) {
        try {
            const parentPrompt = loadRawPrompt(inherits);
            if (parentPrompt) {
                const parentSections = parseSections(parentPrompt.content);
                // Merge: Child sections override Parent sections
                // Iterate over parent sections, if child has it, use child, else use parent
                // Also add any child sections that are unique

                // Strategy: Start with parent sections, overlay child sections
                const mergedSections = { ...parentSections, ...sections };
                return compilePrompt(mergedSections, typeId, version);
            }
        } catch (e) {
            console.error(`Error loading parent prompt '${inherits}': ${e.message}`);
            // Return what we have if parent fails, minimizing disruption
            return compilePrompt(sections, typeId, version);
        }
    }

    return compilePrompt(sections, typeId, version);
}

/**
 * Helper to load raw content without recursion (currently assumes 1 level deep or handled by caller, 
 * but strictly we should probably limit recursion depth if we support multi-level. 
 * For now, only 1 level 'inherits' is common, but recursion is safer.)
 * 
 * Actually, let's refine: loadPrompt is recursive? No, let's make it iterative or recursive.
 * The logic above handles 1 level. Let's stick to 1 level for simplicity as per requirements ("Inherits: GENERAL_DOC_TYPE")
 * multi-level inheritance is YAGNI for now unless specified.
 */
function loadRawPrompt(typeId) {
    const filePath = path.join(PROMPTS_DIR, `${typeId}.mdx`);
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return matter(fileContent);
    }
    return null;
}

/**
 * Parses markdown content into sections based on ## Headers
 */
function parseSections(markdown) {
    const sections = {};
    const lines = markdown.split('\n');
    let currentSection = 'intro'; // Default section for content before first header
    let currentContent = [];

    lines.forEach(line => {
        if (line.startsWith('## ')) {
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }
            currentSection = line.substring(3).trim(); // Extract header text
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    });

    // Capture last section
    if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
}

/**
 * Reconstructs the prompt string from sections
 */
function compilePrompt(sections, typeId, version) {
    let output = `[Role: Expert Legal AI Assistant]\n[Task: Analyze Document Type: ${typeId} (v${version})]\n\n`;

    // Order matters? standard sections should be ordered if possible.
    // We can define a standard order for known sections, and append others.
    const STANDARD_ORDER = ['Summary Guidance', 'Risk Analysis', 'Extraction Targets', 'Validation Checks'];

    STANDARD_ORDER.forEach(key => {
        if (sections[key]) {
            output += `## ${key}\n${sections[key]}\n\n`;
        }
    });

    // Add any custom sections not in standard list
    Object.keys(sections).forEach(key => {
        if (!STANDARD_ORDER.includes(key) && key !== 'intro') {
            output += `## ${key}\n${sections[key]}\n\n`;
        }
    });

    // Intro (if any meaningful content exists, usually frontmatter has standard fields so intro might be empty)
    if (sections['intro']) {
        // Prepend intro if needed, or append? Usually intro is empty in our schema.
    }

    return output.trim();
}

module.exports = {
    loadPrompt
};
