import { describe, it, expect } from 'vitest';
import { validateQuestion } from '../lib/validateQuestion.js';

// Simple translation stub that just echoes the key for assertions
function t(key) {
  return key;
}

describe('validateQuestion (frontend)', () => {
  it('returns translated errors for invalid questions', () => {
    const question = {
      type: 'multiple-choice',
      text: '',
      timeLimit: 5,
      answers: []
    };

    const errors = validateQuestion(question, t);

    // We only assert that some expected keys appear; text formatting is handled by i18n.
    expect(errors.some((msg) => msg.includes('questionValidation.textRequired'))).toBe(true);
    expect(errors.some((msg) => msg.includes('questionValidation.mcAnswerCount'))).toBe(true);
  });
});

