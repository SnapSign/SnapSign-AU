import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FUNCTIONS_DIR = path.resolve(__dirname, '..');
const PROMPTS_DIR = path.join(FUNCTIONS_DIR, 'prompts', 'types');
// Path to documentTypes.js in the web project relative to functions/scripts
const DOC_TYPES_PATH = path.resolve(FUNCTIONS_DIR, '../Decodocs/web/src/lib/documentTypes.js');

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(color, message) {
    console.log(`${color}${message}${COLORS.reset}`);
}

function error(message) {
    console.error(`${COLORS.red}ERROR: ${message}${COLORS.reset}`);
    process.exitCode = 1;
}

// 1. Extract Document Types
function getDefinedTypeIds() {
    if (!fs.existsSync(DOC_TYPES_PATH)) {
        error(`Could not find documentTypes.js at ${DOC_TYPES_PATH}`);
        return [];
    }

    const content = fs.readFileSync(DOC_TYPES_PATH, 'utf8');
    const ids = [];
    const regex = /id:\s*'([^']+)'/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const id = match[1];
        // Exclude special/unreadable types if necessary, or just validating all.
        // Based on the file, 'unreadable_' types might not need prompts.
        if (!id.startsWith('unreadable_')) {
            ids.push(id);
        }
    }

    return ids;
}

// 2. Validate Prompts
function validate() {
    log(COLORS.blue, 'Starting Prompt Pack Validation...');

    // Ensure directories exist
    if (!fs.existsSync(PROMPTS_DIR)) {
        error(`Prompts directory missing: ${PROMPTS_DIR}`);
        return;
    }

    // Get defined IDs
    const requiredIds = getDefinedTypeIds();
    log(COLORS.blue, `Found ${requiredIds.length} analyzable document types.`);

    // Get existing MDX files
    const files = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.mdx'));
    const existingTypes = new Set();
    const fileMap = {}; // typeId -> filename

    // Check Base Type
    if (!files.includes('GENERAL_DOC_TYPE.mdx')) {
        error('Missing Base Prompt: GENERAL_DOC_TYPE.mdx is required.');
    }

    // Parse each file
    files.forEach(file => {
        const filePath = path.join(PROMPTS_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            const { typeId, inherits, version } = parsed.data;

            if (!typeId) {
                error(`File ${file} is missing 'typeId' in frontmatter.`);
                return;
            }
            if (!version) {
                error(`File ${file} is missing 'version' in frontmatter.`);
            }

            if (existingTypes.has(typeId)) {
                error(`Duplicate typeId '${typeId}' found in ${file}.`);
            }

            existingTypes.add(typeId);
            fileMap[typeId] = file;

            // Check inheritance
            if (inherits && inherits !== 'GENERAL_DOC_TYPE') {
                // If we support multi-level, check if parent exists in existingTypes (might need 2-pass if order matters, but currently specific types likely inherit GENERAL)
                // For now, simple check:
                // We can't strictly check parent existence here because we might process child before parent in loop.
                // But usually inherits is GENERAL_DOC_TYPE.
            }

        } catch (e) {
            error(`Error parsing ${file}: ${e.message}`);
        }
    });

    // Verify Coverage
    let missingCount = 0;
    requiredIds.forEach(id => {
        if (!existingTypes.has(id)) {
            // Don't error immediately, listing all missing
            // log(COLORS.yellow, `Missing prompt pack for: ${id}`);
            // missingCount++;
            // Actually, plan says "100% type coverage". So this should be an error.
            // However, for "Initial Coverage" task, we might not have all yet.
            // But Acceptance Criteria 3 says: "Fails CI on missing file".
            // So yes, error.

            // Temporarily, we might want to warn if we are building it up.
            // But to be strict per requirements:
            error(`Missing prompt pack for typeId: ${id}`);
            missingCount++;
        }
    });

    if (missingCount > 0) {
        log(COLORS.red, `Validation Failed: ${missingCount} missing prompt packs.`);
        process.exit(1);
    } else {
        log(COLORS.green, 'All document types have corresponding prompt packs.');
    }

    // Check for orphaned files (files that don't match any ID in code)
    // GENERAL_DOC_TYPE is exception
    const orphaned = [...existingTypes].filter(t => !requiredIds.includes(t) && t !== 'GENERAL_DOC_TYPE');
    if (orphaned.length > 0) {
        log(COLORS.yellow, `Warning: Found ${orphaned.length} orphaned prompt packs (not in documentTypes.js): ${orphaned.join(', ')}`);
    }

    log(COLORS.green, 'Validation Complete.');
}

validate();
