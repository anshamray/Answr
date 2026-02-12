# Question Types – Future Support Analysis

This document maps Kahoot-style question types to our schema design and verifies Answr can support them in the future.

## Current State vs. Required Support

### Documented Question Types (API.md, Architektur.md)

| Type | API.md | Architektur.md | Notes |
|------|--------|----------------|-------|
| multiple-choice | ✓ | ✓ | Core MVP |
| true-false | ✓ | ✓ | Core MVP |
| slider | ✓ | ✗ | Architektur missing |
| puzzle | ✓ | ✗ | Architektur missing |
| free-text | ✓ | ✗ | Architektur missing |

### Kahoot Question Types to Support (Future)

#### Test Knowledge

| Type | Question text | Time limit | Points | Answers | Media | Type-specific |
|------|---------------|------------|--------|---------|-------|---------------|
| **Quiz** (MC) | 120 chars | 5s–4min | 0/1000/2000 | 2–6 options, 75 chars each | image/video | single/multi select |
| **True/False** | 120 chars | 5s–4min | 0/1000/2000 | fixed True/False | image/video | — |
| **Type Answer** | 120 chars | 20s–4min | 0/1000/2000 | 1–4 answers, 20 chars | image/video | case-insensitive |
| **Puzzle** | 120 chars | 20s–4min | 0/1000/2000 | 3–4 ordered, 75 chars | image/video | textToReadAloud |
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
  textToReadAloud: String,  // for Puzzle, Quiz+Audio; max 120 chars
  mediaUrl: String,  // image or video URL
  mediaType: String,  // 'image' | 'video' | 'audio'
  audioLanguage: String,  // for Quiz+Audio; e.g. 'en', 'de'
  timeLimit: Number,  // 5–240 seconds
  points: Number,  // 0, 1000, or 2000
  order: Number,

  // Standard options (Quiz, True/False, Poll, Puzzle, Type Answer)
  answers: [{
    _id: ObjectId,
    text: String,  // max 75 chars for MC, 20 for type-answer
    imageUrl: String,  // optional for Poll/Quiz
    isCorrect: Boolean,  // null for Poll, Word Cloud, etc.
    order: Number  // for Puzzle (correct order)
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
  'puzzle',
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
| puzzle | required, 120 | 20–240 | 0/1000/2000 | 3–4 | textToReadAloud |
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

## Gap Summary

| Area | Status | Action |
|------|--------|--------|
| Quiz model | ⚠️ Missing `questions` array | Add `questions: [ObjectId]` ref |
| Question model | ❌ Not implemented | Create extensible schema |
| Architektur.md | ⚠️ Only 2 types | Update with full type list |
| API.md | ✓ Has 5 types | Extend with full enum + configs |
| Submission/Answer handling | ⚠️ answerId only | Support free text, coordinates, etc. |

---

## Submission Schema (Future)

For non–multiple-choice types, `Submission` must support varied answer formats:

```javascript
{
  participantId: ObjectId,
  questionId: ObjectId,
  questionType: String,  // to interpret payload
  // For MC/TrueFalse: answerId
  answerId: ObjectId,
  // For Type Answer, Word Cloud, Open-ended: free text
  textAnswer: String,
  // For Slider: numeric value
  numericAnswer: Number,
  // For Pin/Drop Pin: coordinates
  pinAnswer: { x: Number, y: Number },
  // For Puzzle: ordered array
  orderedAnswerIds: [ObjectId],
  // Common
  timeTaken: Number,
  pointsAwarded: Number,
  submittedAt: Date
}
```

---

## Recommendation

1. **Quiz**: Add `questions: [{ type: ObjectId, ref: 'Question' }]`.
2. **Question**: Implement schema with `type`, `text`, `timeLimit`, `points`, `order`, `mediaUrl`, `answers`, plus optional `sliderConfig`, `pinConfig`, `scaleConfig`, `brainstormConfig`, `textToReadAloud`, `audioLanguage`, `allowMultipleAnswers`.
3. **Docs**: Update Architektur.md and API.md with the extended Question schema and type list.
4. **Submission**: Keep current `answerId` for MVP; plan polymorphic payload for future types.
