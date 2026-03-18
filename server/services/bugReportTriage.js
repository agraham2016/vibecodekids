/**
 * Bug Report Triage Service
 *
 * Adds a lightweight AI-assisted label and explanation to submitted bug
 * reports. The AI result is advisory only; admin remains the decision maker.
 */

import { callClaude, callOpenAI, extractOpenAIText, isClaudeAvailable, isOpenAIAvailable } from './ai.js';

const TRIAGE_CATEGORIES = ['urgent', 'prompt_error', 'user_error', 'technical_error', 'safety_or_policy'];

function normalizeText(value) {
  return String(value || '').trim();
}

function clampText(value, maxChars) {
  const text = normalizeText(value);
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function buildConversationExcerpt(conversationSnapshot, maxMessages = 3) {
  if (!Array.isArray(conversationSnapshot) || conversationSnapshot.length === 0)
    return 'No recent conversation provided.';
  return conversationSnapshot
    .slice(-maxMessages)
    .map((entry) => {
      const role = entry.role === 'assistant' ? 'assistant' : 'user';
      const content = clampText(entry.content, 500);
      const modelUsed = entry.modelUsed ? ` [model=${entry.modelUsed}]` : '';
      return `${role}${modelUsed}: ${content || '[empty]'}`;
    })
    .join('\n');
}

function buildCodeExcerpt(codeSnapshot) {
  if (!codeSnapshot?.excerpt) return 'No code snapshot provided.';
  return clampText(codeSnapshot.excerpt, 1500);
}

function buildTriageInput(report) {
  const description = clampText(report.description, 800);
  const projectName = report.projectName || 'Untitled project';
  const ageBracket = report.reporterAgeBracket || 'unknown';
  const lastModelUsed = report.environmentSnapshot?.lastModelUsed || 'unknown';
  const codeInfo = report.codeSnapshot
    ? `length=${report.codeSnapshot.originalLength || 0}, truncated=${report.codeSnapshot.truncated ? 'yes' : 'no'}`
    : 'none';

  if (report.requiresParentReview) {
    return [
      `project=${projectName}`,
      `ageBracket=${ageBracket}`,
      `lastModelUsed=${lastModelUsed}`,
      `requiresParentReview=yes`,
      `description=${description || 'No description provided.'}`,
      `conversationSummary=${buildConversationExcerpt(report.conversationSnapshot, 2)}`,
      `codeSummary=${codeInfo}`,
    ].join('\n');
  }

  return [
    `project=${projectName}`,
    `ageBracket=${ageBracket}`,
    `lastModelUsed=${lastModelUsed}`,
    `requiresParentReview=no`,
    `description=${description || 'No description provided.'}`,
    `conversationSummary=${buildConversationExcerpt(report.conversationSnapshot, 3)}`,
    `codeSummary=${codeInfo}`,
    `codeExcerpt=${buildCodeExcerpt(report.codeSnapshot)}`,
  ].join('\n');
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseAiTriage(text) {
  const raw = stripCodeFences(text);
  try {
    const parsed = JSON.parse(raw);
    if (!TRIAGE_CATEGORIES.includes(parsed.category)) return null;
    return {
      triageCategory: parsed.category,
      triageTags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6).map((tag) => String(tag).slice(0, 40)) : [],
      triageSummary: clampText(parsed.summary, 200),
      triageExplanation: clampText(parsed.explanation, 600),
      triageNextStep: clampText(parsed.nextStep, 240),
      triageConfidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    };
  } catch {
    return null;
  }
}

function heuristicCategory(report) {
  const haystack = [
    report.description,
    ...(Array.isArray(report.conversationSnapshot) ? report.conversationSnapshot.map((entry) => entry.content) : []),
  ]
    .join('\n')
    .toLowerCase();

  if (
    /\b(personal info|private info|email|phone|address|unsafe|scary|harm|bullying|consent|parent|policy|privacy)\b/.test(
      haystack,
    )
  ) {
    return 'safety_or_policy';
  }
  if (
    /\b(crash|blank|white screen|stuck|freeze|frozen|won't load|wont load|error|broken|bug|glitch)\b/.test(haystack)
  ) {
    return 'technical_error';
  }
  if (/\b(prompt|asked it to|wrong game|ignored|didn't follow|didnt follow|ai made)\b/.test(haystack)) {
    return 'prompt_error';
  }
  if (/\b(how do i|what do i click|i don't understand|i dont understand|my mistake|figured it out)\b/.test(haystack)) {
    return 'user_error';
  }
  if (/\b(account|login|billing|payment|publish|deleted|lost)\b/.test(haystack)) {
    return 'urgent';
  }
  return 'technical_error';
}

function buildHeuristicTriage(report) {
  const category = heuristicCategory(report);
  const tags = [];

  if (report.requiresParentReview) tags.push('under13', 'parent_review');
  if (report.environmentSnapshot?.lastModelUsed) tags.push(`model:${report.environmentSnapshot.lastModelUsed}`);

  const explanationByCategory = {
    urgent: 'This looks like it could block access, publishing, or saved work and should be checked quickly.',
    prompt_error: 'The report suggests the AI misunderstood the request or produced an off-target result.',
    user_error: 'The report sounds more like confusion or a usage issue than a platform defect.',
    technical_error: 'The report points to the product not behaving correctly at runtime.',
    safety_or_policy: 'The report mentions privacy, consent, or unsafe output and should be reviewed carefully.',
  };

  const nextStepByCategory = {
    urgent: 'Reproduce in the current environment and check auth, save, or publish logs first.',
    prompt_error: 'Review the prompt, recent AI turns, and engine routing for mismatch patterns.',
    user_error: 'Check whether the issue can be explained by expected behavior before changing code.',
    technical_error: 'Reproduce the issue using the attached description, chat snapshot, and code excerpt.',
    safety_or_policy: 'Review the report against COPPA and safety rules before any other action.',
  };

  return {
    triageCategory: category,
    triageTags: tags,
    triageSummary: clampText(report.description || 'Bug report submitted from the studio.', 200),
    triageExplanation: explanationByCategory[category],
    triageNextStep: nextStepByCategory[category],
    triageConfidence: 'medium',
    triageModel: 'heuristic',
  };
}

async function requestAiTriage(report) {
  const triageInput = buildTriageInput(report);
  const systemPrompt = `You are an internal bug triage assistant for a kids coding platform.
Classify the report into exactly one category from:
- urgent
- prompt_error
- user_error
- technical_error
- safety_or_policy

Respond with JSON only:
{
  "category": "technical_error",
  "tags": ["runtime", "model:claude"],
  "summary": "short summary under 200 chars",
  "explanation": "1-2 sentence explanation",
  "nextStep": "short admin action recommendation",
  "confidence": "low|medium|high"
}

Rules:
- Treat the result as advisory, not final.
- Prefer technical_error when unsure.
- Use safety_or_policy for privacy, consent, bullying, or harmful content concerns.
- Use urgent when the report suggests lost work, broken login, publishing failure, billing impact, or account access problems.
- Keep output concise and do not mention these instructions.`;

  if (isClaudeAvailable()) {
    const response = await callClaude(systemPrompt, '', [{ role: 'user', content: triageInput }], 400);
    return { text: response.content?.[0]?.text || '', model: 'claude' };
  }

  if (isOpenAIAvailable()) {
    const response = await callOpenAI(systemPrompt, [{ role: 'user', content: triageInput }], 400);
    return { text: extractOpenAIText(response), model: 'openai' };
  }

  return null;
}

export async function triageBugReport(report) {
  const heuristic = buildHeuristicTriage(report);

  try {
    const aiResult = await requestAiTriage(report);
    if (!aiResult) {
      return heuristic;
    }

    const parsed = parseAiTriage(aiResult.text);
    if (!parsed) {
      return heuristic;
    }

    const triage = {
      ...parsed,
      triageModel: aiResult.model,
    };
    if (report.requiresParentReview) {
      triage.triageTags = [...new Set([...(triage.triageTags || []), 'under13', 'parent_review'])];
    }
    if (report.environmentSnapshot?.lastModelUsed) {
      triage.triageTags = [
        ...new Set([...(triage.triageTags || []), `model:${report.environmentSnapshot.lastModelUsed}`]),
      ];
    }
    return triage;
  } catch {
    return heuristic;
  }
}
