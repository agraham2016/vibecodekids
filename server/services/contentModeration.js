/**
 * ML-Based Content Moderation Service
 *
 * Uses Google Perspective API for toxicity detection on user-generated content.
 * Falls back gracefully to keyword-only filtering if the API key is not configured.
 *
 * Set PERSPECTIVE_API_KEY in .env to enable.
 */

const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

const TOXICITY_THRESHOLD = 0.7;
const SEVERE_TOXICITY_THRESHOLD = 0.5;

/**
 * Check text for toxicity using Perspective API.
 * Returns { flagged: boolean, scores: object, error?: string }
 */
export async function moderateText(text) {
  if (!PERSPECTIVE_API_KEY) {
    return { flagged: false, scores: {}, skipped: true, reason: 'PERSPECTIVE_API_KEY not configured' };
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { flagged: false, scores: {} };
  }

  const truncated = text.slice(0, 3000);

  try {
    const response = await fetch(`${PERSPECTIVE_URL}?key=${PERSPECTIVE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: { text: truncated },
        languages: ['en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          IDENTITY_ATTACK: {},
          INSULT: {},
          THREAT: {},
          SEXUALLY_EXPLICIT: {},
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`Perspective API error: ${response.status}`);
      return { flagged: false, scores: {}, error: `API returned ${response.status}` };
    }

    const data = await response.json();
    const scores = {};
    for (const [attr, val] of Object.entries(data.attributeScores || {})) {
      scores[attr] = val.summaryScore?.value ?? 0;
    }

    const flagged =
      (scores.TOXICITY ?? 0) >= TOXICITY_THRESHOLD ||
      (scores.SEVERE_TOXICITY ?? 0) >= SEVERE_TOXICITY_THRESHOLD ||
      (scores.SEXUALLY_EXPLICIT ?? 0) >= 0.6 ||
      (scores.THREAT ?? 0) >= 0.7;

    return { flagged, scores };
  } catch (err) {
    console.error('Perspective API call failed:', err.message);
    return { flagged: false, scores: {}, error: err.message };
  }
}

/**
 * Combined moderation: keyword filter + ML moderation.
 * Returns { blocked: boolean, reason?: string, scores?: object }
 */
export async function fullModeration(text, options = {}) {
  const { filterContent } = await import('../middleware/contentFilter.js');

  const keywordResult = filterContent(text, options);
  if (keywordResult.blocked) {
    return keywordResult;
  }

  const mlResult = await moderateText(text);
  if (mlResult.flagged) {
    return {
      blocked: true,
      reason: "Let's keep our creations fun and friendly! Try asking about something else you'd like to build.",
      mlScores: mlResult.scores,
    };
  }

  return { blocked: false };
}
