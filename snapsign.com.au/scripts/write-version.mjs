import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(process.cwd());
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const baseVersion = pkg.version || '0.1.0';
let sha = 'unknown';

try {
  sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString('utf8')
    .trim();
} catch {
  // ignore
}

const ts = new Date().toISOString();
const version = `${baseVersion}+${sha}-${ts}`;

const out = `// Auto-generated at build time.\n// See package.json "build" script.\n\nexport const APP_VERSION = ${JSON.stringify(version)};\n`;

fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'lib', 'version.js'), out);

console.log('✅ Wrote app version:', version);
