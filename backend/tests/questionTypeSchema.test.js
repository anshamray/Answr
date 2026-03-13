import { describe, it, expect } from 'vitest';
import {
  getQuestionValidationErrors
} from '../../shared/questionTypeSchema.js';

describe('getQuestionValidationErrors', () => {
  it('validates multiple-choice boundaries', () => {
    const base = { type: 'multiple-choice', text: 'Q1', timeLimit: 30 };

    const tooFew = {
      ...base,
      answers: [{ text: 'A', isCorrect: true }]
    };
    const fewErrors = getQuestionValidationErrors(tooFew).map((e) => e.code);
    expect(fewErrors).toContain('mcAnswerCount');

    const noCorrect = {
      ...base,
      answers: [
        { text: 'A', isCorrect: false },
        { text: 'B', isCorrect: false }
      ]
    };
    const noCorrectErrors = getQuestionValidationErrors(noCorrect).map((e) => e.code);
    expect(noCorrectErrors).toContain('mcNeedsCorrect');

    const valid = {
      ...base,
      answers: [
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: false }
      ]
    };
    const validErrors = getQuestionValidationErrors(valid);
    expect(validErrors).toHaveLength(0);
  });

  it('requires explicit multiple-correct flag when more than one answer is correct', () => {
    const question = {
      type: 'multiple-choice',
      text: 'Pick one',
      timeLimit: 30,
      answers: [
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: true },
        { text: 'C', isCorrect: false }
      ]
    };

    const errors = getQuestionValidationErrors(question).map((e) => e.code);
    expect(errors).toContain('mcMultipleCorrectRequiresFlag');

    const allowed = {
      ...question,
      allowMultipleCorrectAnswers: true
    };
    const allowedErrors = getQuestionValidationErrors(allowed).map((e) => e.code);
    expect(allowedErrors).not.toContain('mcMultipleCorrectRequiresFlag');
  });

  it('enforces true-false answer count', () => {
    const invalid = {
      type: 'true-false',
      text: 'Q',
      timeLimit: 10,
      answers: [{ text: 'True', isCorrect: true }]
    };
    const errors = getQuestionValidationErrors(invalid).map((e) => e.code);
    expect(errors).toContain('tfAnswerCount');
  });

  it('enforces type-answer answer length and count', () => {
    const tooLong = {
      type: 'type-answer',
      text: 'Q',
      timeLimit: 30,
      answers: [{ text: 'x'.repeat(25), isCorrect: true }]
    };
    const errors = getQuestionValidationErrors(tooLong).map((e) => e.code);
    expect(errors).toContain('taAnswerLength');

    const none = {
      type: 'type-answer',
      text: 'Q',
      timeLimit: 30,
      answers: []
    };
    const noneErrors = getQuestionValidationErrors(none).map((e) => e.code);
    expect(noneErrors).toContain('taAnswerCount');
  });

  it('enforces sort answer count boundaries', () => {
    const tooFew = {
      type: 'sort',
      text: 'Q',
      timeLimit: 30,
      answers: [{ text: 'A' }, { text: 'B' }]
    };
    const errors = getQuestionValidationErrors(tooFew).map((e) => e.code);
    expect(errors).toContain('sortAnswerCount');
  });

  it('requires audioLanguage for quiz-audio', () => {
    const q = {
      type: 'quiz-audio',
      text: 'Q',
      timeLimit: 10,
      answers: [],
      audioLanguage: null
    };
    const errors = getQuestionValidationErrors(q).map((e) => e.code);
    expect(errors).toContain('audioLanguageRequired');
  });

  it('validates slider config boundaries', () => {
    const missing = {
      type: 'slider',
      text: 'Q',
      timeLimit: 20,
      answers: [],
      sliderConfig: {}
    };
    const missingErrors = getQuestionValidationErrors(missing).map((e) => e.code);
    expect(missingErrors).toContain('sliderConfigRequired');

    const invalidRange = {
      type: 'slider',
      text: 'Q',
      timeLimit: 20,
      answers: [],
      sliderConfig: { min: 10, max: 5 }
    };
    const rangeErrors = getQuestionValidationErrors(invalidRange).map((e) => e.code);
    expect(rangeErrors).toContain('sliderMinMax');
  });

  it('requires media and pin config for pin-answer', () => {
    const q = {
      type: 'pin-answer',
      text: 'Q',
      timeLimit: 30,
      answers: [],
      mediaUrl: null,
      pinConfig: {}
    };
    const errors = getQuestionValidationErrors(q).map((e) => e.code);
    expect(errors).toContain('pinImageRequired');
    expect(errors).toContain('pinConfigRequired');
  });

  it('enforces min timeLimit per type', () => {
    const q = {
      type: 'brainstorm',
      text: 'Q',
      timeLimit: 10,
      answers: []
    };
    const errors = getQuestionValidationErrors(q).map((e) => e.code);
    expect(errors).toContain('timeLimitTooLow');
  });

  it('requires config for brainstorm, scale and nps-scale', () => {
    const brainstorm = {
      type: 'brainstorm',
      text: '',
      timeLimit: 40,
      answers: [],
      brainstormConfig: {}
    };
    const brainstormErrors = getQuestionValidationErrors(brainstorm).map((e) => e.code);
    expect(brainstormErrors).toContain('brainstormConfigRequired');

    const scale = {
      type: 'scale',
      text: '',
      timeLimit: 20,
      answers: [],
      scaleConfig: {}
    };
    const scaleErrors = getQuestionValidationErrors(scale).map((e) => e.code);
    expect(scaleErrors).toContain('scaleConfigRequired');

    const nps = {
      type: 'nps-scale',
      text: '',
      timeLimit: 20,
      answers: [],
      scaleConfig: {}
    };
    const npsErrors = getQuestionValidationErrors(nps).map((e) => e.code);
    expect(npsErrors).toContain('npsScaleConfigRequired');
  });
});

