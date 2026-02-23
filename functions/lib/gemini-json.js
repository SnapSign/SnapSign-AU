const safeString = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

const extractFirstJsonValue = (text) => {
  const src = safeString(text, '').trim();
  if (!src) return null;

  // Fast path: already pure JSON.
  try {
    return JSON.parse(src);
  } catch {
    // Continue to extraction.
  }

  const startCandidates = [];
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{' || ch === '[') {
      startCandidates.push(i);
      if (startCandidates.length >= 8) break; // avoid pathological scans
    }
  }

  const isOpening = (ch) => ch === '{' || ch === '[';
  const isClosing = (ch) => ch === '}' || ch === ']';
  const matches = (open, close) => (open === '{' && close === '}') || (open === '[' && close === ']');

  for (const start of startCandidates) {
    const open = src[start];
    const stack = [open];
    let inString = false;
    let escape = false;

    for (let i = start + 1; i < src.length; i += 1) {
      const ch = src[i];

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (isOpening(ch)) {
        stack.push(ch);
        continue;
      }
      if (isClosing(ch)) {
        const lastOpen = stack[stack.length - 1];
        if (!matches(lastOpen, ch)) {
          // Invalid nesting; abandon this candidate.
          break;
        }
        stack.pop();
        if (stack.length === 0) {
          const candidate = src.slice(start, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
};

const appendStrictJsonInstruction = (prompt) => {
  const base = safeString(prompt, '');
  return `${base}\n\nIMPORTANT:\n- Return ONLY valid JSON.\n- Do not wrap JSON in markdown fences.\n`;
};

/**
 * Calls Gemini and returns parsed JSON. Retries with progressively less strict config
 * to avoid hard failures when structured output features are not available.
 */
async function generateGeminiJson({
  model,
  prompt,
  schema = null,
  temperature = 0.2,
  responseMimeType = 'application/json',
  maxAttempts = 3,
}) {
  if (!model || typeof model.generateContent !== 'function') {
    throw new Error('Gemini model not available');
  }

  const baseRequest = (text) => ({
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature },
  });

  const attempts = [];

  // Attempt 1: schema + JSON mime type (best when supported).
  if (schema) {
    attempts.push({
      label: 'schema+json',
      request: (text) => ({
        ...baseRequest(text),
        generationConfig: {
          ...baseRequest(text).generationConfig,
          responseSchema: schema,
          responseMimeType,
        },
      }),
    });
  }

  // Attempt 2: JSON mime type only.
  attempts.push({
    label: 'json',
    request: (text) => ({
      ...baseRequest(text),
      generationConfig: {
        ...baseRequest(text).generationConfig,
        responseMimeType,
      },
    }),
  });

  // Attempt 3: no structured hints; rely on prompt instruction and JSON extraction.
  attempts.push({
    label: 'raw',
    request: (text) => baseRequest(text),
  });

  const errors = [];
  const sliced = attempts.slice(0, Math.max(1, Math.min(maxAttempts, attempts.length)));

  for (const attempt of sliced) {
    try {
      const text = attempt.label === 'raw' ? appendStrictJsonInstruction(prompt) : prompt;
      const res = await model.generateContent(attempt.request(text));
      const rawText = safeString(res?.response?.text?.(), '');
      const parsed = extractFirstJsonValue(rawText);
      if (parsed === null || parsed === undefined) {
        throw new Error(`Gemini returned non-JSON response (attempt ${attempt.label})`);
      }
      return { data: parsed, rawText, attempt: attempt.label };
    } catch (err) {
      // Propagate rate-limit errors immediately — fallback strategies cannot help,
      // and retrying with different config options still hits the same quota limit.
      if (err?.status === 429) throw err;
      errors.push({ attempt: attempt.label, message: safeString(err?.message, err) });
    }
  }

  const detail = errors.map((e) => `${e.attempt}: ${e.message}`).join(' | ');
  throw new Error(`Gemini JSON generation failed after ${sliced.length} attempt(s): ${detail}`);
}

module.exports = {
  extractFirstJsonValue,
  generateGeminiJson,
};

