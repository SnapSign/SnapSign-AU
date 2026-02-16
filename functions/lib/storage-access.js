const normalizeObjectKey = (key) =>
  String(key || '')
    .replace(/^\/*/, '')
    .replace(/\.\./g, '')
    .trim();

const assertUserScopedKey = (key, puid) => {
  const normalized = normalizeObjectKey(key);
  if (!normalized) return false;
  return normalized.startsWith(`${puid}/`);
};

module.exports = {
  normalizeObjectKey,
  assertUserScopedKey,
};
