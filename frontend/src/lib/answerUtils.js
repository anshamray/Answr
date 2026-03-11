/**
 * Shared helpers for working with answers and distributions on the moderator side.
 * These are intentionally framework-agnostic so they can be used in both
 * components and tests.
 */

export function questionAllowsMultipleAnswers(question) {
  if (!question) return false;
  if (question.allowMultipleAnswers) return true;
  return (question.answers || []).filter((answer) => answer.isCorrect).length > 1;
}

export function normalizeTextAnswer(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function parsePinAnswer(answerId) {
  if (answerId == null) return null;

  let parsed = answerId;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  const x = Number(parsed?.x);
  const y = Number(parsed?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    x: Math.min(Math.max(x, 0), 100),
    y: Math.min(Math.max(y, 0), 100)
  };
}

export function getSelectedAnswerIds(answerId) {
  if (answerId == null) return [];
  if (Array.isArray(answerId)) {
    return answerId.map((id) => String(id));
  }
  return [String(answerId)];
}

export function getAnswerDistributionKeysForQuestion(question, answerId) {
  const qType = question?.type || 'multiple-choice';
  if (answerId == null) return [];

  if (qType === 'sort') {
    return [getSelectedAnswerIds(answerId).join(',')];
  }

  if (qType === 'type-answer' || qType === 'word-cloud') {
    const normalized = normalizeTextAnswer(answerId);
    return normalized ? [normalized] : [];
  }

  if (questionAllowsMultipleAnswers(question)) {
    return getSelectedAnswerIds(answerId);
  }

  if (Array.isArray(answerId)) {
    return [answerId.map((id) => String(id)).join(',')];
  }

  return [String(answerId)];
}

