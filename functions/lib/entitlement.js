const isProFlagEnabled = (userData) => {
  if (!userData || typeof userData !== 'object') return false;

  // New canonical flag (explicit Firestore switch)
  if (typeof userData.isPro === 'boolean') return userData.isPro;

  // Backward compatibility during migration.
  if (typeof userData?.subscription?.isPro === 'boolean') {
    return userData.subscription.isPro;
  }

  return false;
};

module.exports = {
  isProFlagEnabled,
};
