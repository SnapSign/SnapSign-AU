const redactKey = (key) => {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}…${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
};

const parseArgs = (argv) => {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[key] = value;
    if (value !== 'true') i += 1;
  }
  return out;
};

const main = async () => {
  const args = parseArgs(process.argv);
  const base = String(args.base || 'https://decodocs.com').replace(/\/+$/, '');
  const token = String(args.token || process.env.FIREBASE_ID_TOKEN || '').trim();
  const qpath = String(args.qpath || 'admin/gemini').trim();

  if (!token) {
    console.error('Missing token. Pass --token <FIREBASE_ID_TOKEN> or set FIREBASE_ID_TOKEN in the environment.');
    process.exit(2);
  }

  const url = new URL('/api/getDocByPath', base);
  url.searchParams.set('qpath', qpath);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // leave as text
  }

  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`);
    console.error(typeof json === 'object' ? JSON.stringify(json, null, 2) : text);
    process.exit(1);
  }

  const data = json?.data || {};
  const mode = typeof data.mode === 'string' ? data.mode : null;
  const modeCfg = mode && typeof data[mode] === 'object' && data[mode] ? data[mode] : null;

  const key = (typeof modeCfg?.key === 'string' && modeCfg.key.trim())
    ? modeCfg.key.trim()
    : (typeof data.key === 'string' ? data.key.trim() : '');

  const model = (typeof modeCfg?.model === 'string' && modeCfg.model.trim())
    ? modeCfg.model.trim()
    : (typeof data.model === 'string' ? data.model.trim() : '');

  const report = {
    ok: true,
    path: json?.path || qpath,
    hasKey: !!key,
    keyRedacted: key ? redactKey(key) : null,
    keyLength: key ? key.length : 0,
    mode,
    model: model || null,
  };

  if (args.json === 'true') {
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }

  console.log('Gemini config check (admin doc read via deployed getDocByPath):');
  console.log(`- path: ${report.path}`);
  console.log(`- hasKey: ${report.hasKey} (${report.keyRedacted || '—'}, len=${report.keyLength})`);
  console.log(`- mode: ${report.mode || '—'}`);
  console.log(`- model: ${report.model || '—'}`);
};

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

