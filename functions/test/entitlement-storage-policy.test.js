const { expect } = require('chai');
const { isProFlagEnabled } = require('../lib/entitlement');
const { normalizeObjectKey, assertUserScopedKey } = require('../lib/storage-access');

describe('Entitlement + Storage Policy Helpers', () => {
  describe('isProFlagEnabled', () => {
    it('should prefer explicit users/{uid}.isPro=true', () => {
      const user = { isPro: true, subscription: { isPro: false } };
      expect(isProFlagEnabled(user)).to.equal(true);
    });

    it('should treat users/{uid}.isPro=false as non-pro even if legacy subscription flag is true', () => {
      const user = { isPro: false, subscription: { isPro: true } };
      expect(isProFlagEnabled(user)).to.equal(false);
    });

    it('should fall back to legacy subscription.isPro when isPro flag is absent', () => {
      const legacyPro = { subscription: { isPro: true } };
      const legacyFree = { subscription: { isPro: false } };
      expect(isProFlagEnabled(legacyPro)).to.equal(true);
      expect(isProFlagEnabled(legacyFree)).to.equal(false);
    });

    it('should default to false for empty/invalid user docs', () => {
      expect(isProFlagEnabled(null)).to.equal(false);
      expect(isProFlagEnabled(undefined)).to.equal(false);
      expect(isProFlagEnabled({})).to.equal(false);
    });
  });

  describe('storage key policy', () => {
    it('should normalize key paths safely', () => {
      expect(normalizeObjectKey('/abc/def.pdf')).to.equal('abc/def.pdf');
      expect(normalizeObjectKey('../../evil.pdf')).to.not.include('..');
      expect(normalizeObjectKey('')).to.equal('');
    });

    it('should allow only keys scoped to puid prefix', () => {
      expect(assertUserScopedKey('user1/docs/a.pdf', 'user1')).to.equal(true);
      expect(assertUserScopedKey('/user1/docs/a.pdf', 'user1')).to.equal(true);
      expect(assertUserScopedKey('user2/docs/a.pdf', 'user1')).to.equal(false);
      expect(assertUserScopedKey('', 'user1')).to.equal(false);
    });
  });
});
