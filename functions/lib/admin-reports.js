class AdminReportsLogger {
  constructor({ db, admin, collectionName = 'admin_reports' }) {
    this.db = db;
    this.admin = admin;
    this.collectionName = collectionName;
  }

  safeString(value, fallback = '') {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (value === null || value === undefined) return fallback;
    const asText = String(value).trim();
    return asText || fallback;
  }

  redactSensitive(key, value) {
    const lowered = String(key || '').toLowerCase();
    const sensitiveFragments = ['text', 'content', 'selection', 'pdf', 'base64', 'raw'];
    if (sensitiveFragments.some((fragment) => lowered.includes(fragment))) {
      return '[REDACTED]';
    }
    return value;
  }

  sanitizeReportValue(value, depth = 0) {
    if (depth > 4) return '[TRUNCATED]';
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.slice(0, 3000);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => this.sanitizeReportValue(item, depth + 1));
    if (typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value).slice(0, 40)) {
        out[k] = this.sanitizeReportValue(this.redactSensitive(k, v), depth + 1);
      }
      return out;
    }
    return String(value).slice(0, 500);
  }

  async logAdminReport(report) {
    await this.db.collection(this.collectionName).add({
      status: 'open',
      createdAt: this.admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: this.admin.firestore.FieldValue.serverTimestamp(),
      ...report,
    });
  }

  async logBackendException({ functionName, error, context = null, input = null }) {
    try {
      const token = context?.auth?.token || {};
      await this.logAdminReport({
        reportType: 'backend_exception',
        source: 'functions',
        severity: 'error',
        functionName: this.safeString(functionName, 'unknown'),
        message: this.safeString(error?.message, 'Unknown error'),
        code: this.safeString(error?.code, null),
        statusCode: Number.isFinite(Number(error?.status)) ? Number(error.status) : null,
        stack: this.safeString(error?.stack, '').slice(0, 6000),
        uid: context?.auth?.uid || null,
        email: token?.email || null,
        authProvider: token?.firebase?.sign_in_provider || null,
        input: this.sanitizeReportValue(input || null),
      });
    } catch (loggingError) {
      console.error('Failed to log backend exception:', loggingError);
    }
  }

  async logClientException({
    source,
    context = null,
    eventType,
    message,
    stack,
    errorName,
    pageUrl,
    userAgent,
    extra = null,
  }) {
    const token = context?.auth?.token || {};
    await this.logAdminReport({
      reportType: 'client_exception',
      source: this.safeString(source, 'unknown'),
      severity: 'error',
      functionName: 'submitClientCrash',
      eventType: this.safeString(eventType, 'unknown'),
      message: this.safeString(message, 'Unknown client error'),
      stack: this.safeString(stack, '').slice(0, 6000),
      errorName: this.safeString(errorName, null),
      pageUrl: this.safeString(pageUrl, null),
      userAgent: this.safeString(userAgent, null),
      uid: context?.auth?.uid || null,
      email: token?.email || null,
      authProvider: token?.firebase?.sign_in_provider || null,
      input: this.sanitizeReportValue(extra || null),
    });
  }
}

module.exports = {
  AdminReportsLogger,
};
