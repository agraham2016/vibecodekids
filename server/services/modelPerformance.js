/**
 * Model Performance — Aggregate stats from generate + feedback events
 *
 * Used by admin dashboard to compare Claude vs Grok.
 */

import { readEvents, readFeedbackEvents } from './eventStore.js';

/**
 * Get aggregated model performance stats.
 *
 * @param {object} [opts]
 * @param {number} [opts.periodDays=7]
 * @returns {Promise<object>}
 */
export async function getModelPerformanceStats(opts = {}) {
  const periodDays = opts.periodDays ?? 7;
  const events = await readEvents({ sinceDays: periodDays });

  const sessionsByStartingModel = { claude: 0, grok: 0 };
  const generationsByModel = { claude: 0, grok: 0 };
  const successByModel = { claude: { total: 0, withCode: 0 }, grok: { total: 0, withCode: 0 } };
  const uniqueSessions = new Set();

  for (const e of events) {
    if (e.sessionId) uniqueSessions.add(e.sessionId);

    if (e.startingModel && (e.startingModel === 'claude' || e.startingModel === 'grok')) {
      sessionsByStartingModel[e.startingModel]++;
    }

    const model = e.modelUsed || 'claude';
    if (model === 'claude' || model === 'grok') {
      generationsByModel[model]++;
      successByModel[model].total++;
      if (e.hasCode) successByModel[model].withCode++;
    }
  }

  const totalGenerations = events.length;
  const successRateByModel = {
    claude: successByModel.claude.total > 0
      ? ((successByModel.claude.withCode / successByModel.claude.total) * 100).toFixed(1) + '%'
      : '0%',
    grok: successByModel.grok.total > 0
      ? ((successByModel.grok.withCode / successByModel.grok.total) * 100).toFixed(1) + '%'
      : '0%',
  };

  // Feedback stats (thumbs up/down)
  const feedbackEvents = await readFeedbackEvents({ sinceDays: periodDays });
  const feedbackByModel = { claude: { thumbsUp: 0, thumbsDown: 0 }, grok: { thumbsUp: 0, thumbsDown: 0 } };
  for (const f of feedbackEvents) {
    const m = f.modelUsed === 'grok' ? 'grok' : 'claude';
    if (f.outcome === 'thumbsUp') feedbackByModel[m].thumbsUp++;
    else if (f.outcome === 'thumbsDown') feedbackByModel[m].thumbsDown++;
  }
  const feedbackTotal = feedbackEvents.length;

  return {
    periodDays,
    periodLabel: `Last ${periodDays} days`,
    totalGenerations,
    uniqueSessions: uniqueSessions.size,
    sessionsByStartingModel,
    generationsByModel,
    successRateByModel,
    successByModel: {
      claude: { total: successByModel.claude.total, withCode: successByModel.claude.withCode },
      grok: { total: successByModel.grok.total, withCode: successByModel.grok.withCode },
    },
    eventCount: events.length,
    feedbackTotal,
    feedbackByModel,
    feedbackRateByModel: {
      claude: feedbackByModel.claude.thumbsUp + feedbackByModel.claude.thumbsDown > 0
        ? ((feedbackByModel.claude.thumbsUp / (feedbackByModel.claude.thumbsUp + feedbackByModel.claude.thumbsDown)) * 100).toFixed(1) + '%'
        : null,
      grok: feedbackByModel.grok.thumbsUp + feedbackByModel.grok.thumbsDown > 0
        ? ((feedbackByModel.grok.thumbsUp / (feedbackByModel.grok.thumbsUp + feedbackByModel.grok.thumbsDown)) * 100).toFixed(1) + '%'
        : null,
    },
  };
}
