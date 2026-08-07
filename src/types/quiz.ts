export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Option {
  id: string; // e.g., 'A', 'B', 'C', 'D'
  text: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: Option[];
  correctOptionId: string; // 'A', 'B', 'C', 'D'
  explanation?: string;
  topic?: string;
  marks?: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  category: string;
  difficulty: DifficultyLevel;
  timeLimitMinutes: number; // in minutes, e.g. 15
  passingPercentage: number; // e.g. 60
  questions: Question[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author?: string;
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
}

export interface QuizAttemptResult {
  id: string;
  quizId: string;
  quizTitle: string;
  topic: string;
  candidateName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  attemptedAt: string;
  userAnswers: Record<string, UserAnswer>; // questionId -> UserAnswer
}

export interface ParsedQuestion {
  tempId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParseResult {
  title?: string;
  topic?: string;
  questions: ParsedQuestion[];
  rawText?: string;
  errors: string[];
}
