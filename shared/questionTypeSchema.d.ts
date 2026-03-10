export type QuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'type-answer'
  | 'sort'
  | 'quiz-audio'
  | 'slider'
  | 'pin-answer'
  | 'poll'
  | 'word-cloud'
  | 'brainstorm'
  | 'drop-pin'
  | 'open-ended'
  | 'scale'
  | 'nps-scale';

export interface AnswerLike {
  text?: string;
  isCorrect?: boolean | null;
}

export interface SliderConfig {
  min?: number;
  max?: number;
  unit?: string;
  correctValue?: number;
  margin?: 'none' | 'low' | 'medium' | 'high' | 'max';
}

export interface PinConfig {
  x?: number;
  y?: number;
  radius?: number;
}

export interface ScaleConfig {
  scaleType?: 'likert' | 'custom' | 'nps';
  min?: number;
  max?: number;
  startLabel?: string;
  endLabel?: string;
}

export interface BrainstormConfig {
  maxIdeas?: number;
  votingTime?: number;
}

export interface QuestionLike {
  type: QuestionType;
  text?: string;
  points?: number;
  timeLimit?: number;
  answers?: AnswerLike[];
  mediaUrl?: string | null;
  audioLanguage?: string | null;
  sliderConfig?: SliderConfig | null;
  pinConfig?: PinConfig | null;
  scaleConfig?: ScaleConfig | null;
  brainstormConfig?: BrainstormConfig | null;
}

export interface QuestionValidationError {
  code: string;
  params?: Record<string, any>;
}

export const QUESTION_TYPES: QuestionType[];
export const TEXT_OPTIONAL_TYPES: QuestionType[];
export const SCORED_TYPES: QuestionType[];
export const MIN_TIME_LIMIT: Record<string, number>;

export function getQuestionValidationErrors(question: QuestionLike | null | undefined): QuestionValidationError[];

export function getBackendValidationMessages(question: QuestionLike | null | undefined): string[];

