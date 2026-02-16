# Question Types – Future Support Analysis

This document maps Kahoot-style question types to our schema design and verifies Answr can support them in the future.

## Current State vs. Required Support

### Documented Question Types (API.md, Architektur.md)

| Type | API.md | Architektur.md | Notes |
|------|--------|----------------|-------|
| multiple-choice | ✓ | ✓ | Core MVP |
| true-false | ✓ | ✓ | Core MVP |
| slider | ✓ | ✗ | Architektur missing |
| sort | ✓ | ✗ | Architektur missing |
| free-text | ✓ | ✗ | Architektur missing |

### Kahoot Question Types to Support (Future)

#### Test Knowledge

| Type | Question text | Time limit | Points | Answers | Media | Type-specific |
|------|---------------|------------|--------|---------|-------|---------------|
| **Quiz** (MC) | 120 chars | 5s–4min | 0/1000/2000 | 2–6 options, 75 chars each | image/video | single/multi select |
| **True/False** | 120 chars | 5s–4min | 0/1000/2000 | fixed True/False | image/video | — |
| **Type Answer** | 120 chars | 20s–4min | 0/1000/2000 | 1–4 answers, 20 chars | image/video | case-insensitive |
| **Sort** | 120 chars | 20s–4min | 0/1000/2000 | 3–4 ordered, 75 chars | image/video | textToReadAloud |
| **Quiz + Audio** | 120 chars | — | 0/1000/2000 | per type | audio only | language (37) |
| **Slider** | 120 chars | 10s–4min | 0/1000/2000 | min, max, unit | image/video | margin, precision |
| **Pin Answer** | 120 chars | 20s–4min | 0/1000/2000 | correct area (coords) | image required | — |

#### Collect Opinions (no points)

| Type | Question text | Time limit | Answers | Media | Type-specific |
|------|---------------|------------|---------|-------|---------------|
| **Poll** | 120 chars | 5s–4min | 2–6 options, 75 chars | image/video | single/multi select |
| **Word Cloud** | 120 chars | 20s–4min | free text, 20 chars | image/video | — |
| **Brainstorm** | — | 30s–4min | up to 5 ideas, 75 chars | — | voting phase |
| **Drop Pin** | 120 chars | 20s–4min | pin on image | image required | — |
| **Open-ended** | 120 chars | 20s–4min | free text, 250 chars | image/video | highlight word |
| **Scale** | — | — | Likert 1–5 or custom | — | labels |
| **NPS Scale** | — | — | 0–10 | — | NPS calculation |

---

## Proposed Question Schema (Extensible)

To support all types above, the Question schema uses a flexible `answers` array and type-specific optional fields:

```javascript
{
  _id: ObjectId,
  quizId: ObjectId (ref: Quiz),
  type: String,  // see QuestionType enum below
  text: String,  // max 120 chars (validate in API)
  textToReadAloud: String,  // for Sort, Quiz+Audio; max 120 chars
  mediaUrl: String,  // image or video URL
  mediaType: String,  // 'image' | 'video' | 'audio'
  audioLanguage: String,  // for Quiz+Audio; e.g. 'en', 'de'
  timeLimit: Number,  // 5–240 seconds
  points: Number,  // 0, 1000, or 2000
  order: Number,

  // Standard options (Quiz, True/False, Poll, Sort, Type Answer)
  answers: [{
    _id: ObjectId,
    text: String,  // max 75 chars for MC, 20 for type-answer
    imageUrl: String,  // optional for Poll/Quiz
    isCorrect: Boolean,  // null for Poll, Word Cloud, etc.
    order: Number  // for Sort (correct order)
  }],

  // Slider-specific
  sliderConfig: {
    min: Number,
    max: Number,
    unit: String,  // max 20 chars
    correctValue: Number,
    margin: String  // 'none' | 'low' | 'medium' | 'high' | 'max'
  },

  // Pin/Drop Pin: correct area on image
  pinConfig: {
    x: Number,  // 0–100 percentage
    y: Number,
    radius: Number  // tolerance in %
  },

  // Scale/NPS-specific
  scaleConfig: {
    scaleType: String,  // 'likert' | 'custom' | 'nps'
    min: Number,
    max: Number,
    startLabel: String,
    endLabel: String
  },

  // Brainstorm-specific
  brainstormConfig: {
    maxIdeas: Number,  // 1–5
    votingTime: Number  // seconds
  },

  // Multi-select (Quiz, Poll)
  allowMultipleAnswers: Boolean
}
```

### QuestionType Enum (Full List)

```javascript
const QUESTION_TYPES = [
  // MVP
  'multiple-choice',
  'true-false',
  // Test knowledge (future)
  'type-answer',
  'sort',
  'quiz-audio',
  'slider',
  'pin-answer',
  // Collect opinions (future)
  'poll',
  'word-cloud',
  'brainstorm',
  'drop-pin',
  'open-ended',
  'scale',
  'nps-scale'
];
```

---

## Validation Rules by Type

| Type | text | timeLimit | points | answers | Other |
|------|------|-----------|--------|---------|-------|
| multiple-choice | required, 120 | 5–240 | 0/1000/2000 | 2–6, 1+ correct | allowMultipleAnswers |
| true-false | required, 120 | 5–240 | 0/1000/2000 | 2 (fixed) | — |
| type-answer | required, 120 | 20–240 | 0/1000/2000 | 1–4 | case-insensitive |
| sort | required, 120 | 20–240 | 0/1000/2000 | 3–4 | textToReadAloud |
| quiz-audio | required, 120 | 5–240 | 0/1000/2000 | varies | audioLanguage |
| slider | required, 120 | 10–240 | 0/1000/2000 | sliderConfig | — |
| pin-answer | required, 120 | 20–240 | 0/1000/2000 | pinConfig | mediaUrl required |
| poll | required, 120 | 5–240 | 0 (no points) | 2–6 | allowMultipleAnswers |
| word-cloud | required, 120 | 20–240 | 0 | — | — |
| brainstorm | optional | 30–240 | 0 | — | brainstormConfig |
| drop-pin | required, 120 | 20–240 | 0 | — | mediaUrl required |
| open-ended | required, 120 | 20–240 | 0 | — | — |
| scale | optional | — | 0 | — | scaleConfig |
| nps-scale | optional | — | 0 | — | scaleConfig |

---

## Implementation Status

| Area | Status | Details |
|------|--------|---------|
| Quiz model | ✅ Implemented | `questions: [ObjectId]` ref to Question |
| Question model | ✅ Implemented | Extensible schema with all 14 types, per-type validation |
| Question validation | ✅ Implemented | Pre-validate hook enforces per-type rules (text, timeLimit, points, answers, configs) |
| Architektur.md | ✅ Updated | Full type list, all collections documented |
| API.md | ✅ Updated | Full enum, type-specific configs, validation table, request examples |
| Submission model | ✅ Implemented | Polymorphic payload: answerId, answerIds, textAnswer, numericAnswer, pinAnswer, orderedAnswerIds |

---

## Submission Schema

The Submission model supports all answer formats via polymorphic fields.
Which field is populated depends on `questionType`:

| questionType | Answer field(s) |
|-------------|----------------|
| multiple-choice, true-false, quiz-audio | `answerId` (+ `answerIds` for multi-select) |
| poll | `answerId` or `answerIds` (multi-select) |
| type-answer, word-cloud, open-ended, brainstorm | `textAnswer` |
| slider, scale, nps-scale | `numericAnswer` |
| pin-answer, drop-pin | `pinAnswer { x, y }` |
| sort | `orderedAnswerIds` |

```javascript
{
  participantId: ObjectId,
  questionId: ObjectId,
  questionType: String,              // copied from Question.type
  answerId: ObjectId,                // single-select MC / true-false / poll / quiz-audio
  answerIds: [ObjectId],             // multi-select MC / poll
  textAnswer: String,                // type-answer, word-cloud, open-ended, brainstorm
  numericAnswer: Number,             // slider, scale, nps-scale
  pinAnswer: { x: Number, y: Number }, // pin-answer, drop-pin (0–100 %)
  orderedAnswerIds: [ObjectId],      // sort
  timeTaken: Number,
  pointsAwarded: Number,
  createdAt: Date
}
```

Unique constraint: one submission per participant per question.

---

## Question Validation Summary

All 14 question types are validated in `Question.pre('validate')`:

- **text**: Required for all types except brainstorm, scale, nps-scale
- **points**: Must be 0 for opinion types (poll, word-cloud, brainstorm, drop-pin, open-ended, scale, nps-scale)
- **timeLimit**: Per-type minimum enforced (5s for MC/TF, 10s for slider, 20s for type-answer/sort/pin-answer/word-cloud/drop-pin/open-ended, 30s for brainstorm)
- **answers**: Count validated per type (MC: 2–6 with 1+ correct; TF: exactly 2; type-answer: 1–4; sort: 3–4; poll: 2–6)
- **configs**: Required where applicable (sliderConfig for slider, pinConfig for pin-answer, scaleConfig for scale/nps-scale, brainstormConfig for brainstorm)
- **media**: `mediaUrl` required for pin-answer and drop-pin
- **audio**: `audioLanguage` required for quiz-audio
