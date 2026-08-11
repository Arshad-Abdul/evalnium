export type QuestionType = 'mcq' | 'multiple_select' | 'match_following';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Option {
  id: string; // e.g., 'A', 'B', 'C', 'D'
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  questionText: string;
  questionEnglish?: string;
  questionHindi?: string;
  options: Option[];
  correctOptionId: string; // 'A', 'B', 'C', 'D'
  correctOptionIds?: string[]; // For Multiple Select Questions (MSQ)
  questionType?: QuestionType;
  imageUrl?: string;
  listI?: string[]; // Match the Following List I items
  listII?: string[]; // Match the Following List II items
  explanation?: string;
  explanationEnglish?: string;
  explanationHindi?: string;
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
  negativeMarks?: number; // e.g. 0, 0.25, 0.33, 0.5
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  enablePracticeMode?: boolean;
  quizType?: 'practice' | 'live_contest'; // 'practice' (24/7 Unlimited) vs 'live_contest' (Strict 1-Time Lock)
  scheduledStartDateTime?: string; // ISO string e.g. "2026-08-10T10:00"
  scheduledEndDateTime?: string; // ISO string e.g. "2026-08-10T12:00"
  defaultLanguageMode?: 'en' | 'hi' | 'dual';
  accessCode?: string;
  allowedEmails?: string[];
  questions: Question[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author?: string;

  // --- Granular Admin Settings & Rules ---
  enableCertificate?: boolean;
  enableAntiCheating?: boolean;
  maxAttempts?: number; // 0 or undefined = unlimited
  maxTabSwitches?: number; // violations before auto-submit, default 3
  resultAnnouncementDateTime?: string; // ISO string; if set and in future, results are hidden
  timingMode?: 'quiz' | 'sectional' | 'question';
  sectionalConfig?: {
    id: string;
    sectionName: string;
    questionIds: string[];
    questionCount?: number;
    timeLimitMinutes: number;
  }[];
  questionTimeLimitSeconds?: number;
  preventPreviousSectionReturn?: boolean;
  preventEarlyNextSection?: boolean;
  preventPreviousQuestionReturn?: boolean;
  preventEarlyNextQuestion?: boolean;
  questionViewMode?: 'both' | 'single_only' | 'all_only';
  allowManualEarlyMove?: boolean; // Allow candidate to manually finish section early & move to next (but cannot return)
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId: string | null;
  selectedOptionIds?: string[];
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
}

export interface QuizAttemptResult {
  id: string;
  quizId: string;
  quizTitle: string;
  candidateName: string;
  candidateEmail?: string;
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  attemptedAt: string;
  userAnswers: Record<string, UserAnswer>;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  totalQuestions?: number;
  attemptedQuestions?: number;
  attemptsCount?: number;
  bestScore?: number;
  bestPercentage?: number;
}

export interface ParseResult {
  existingQuizId?: string;
  title?: string;
  description?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
  timeLimitMinutes?: number;
  passingPercentage?: number;
  negativeMarks?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  enablePracticeMode?: boolean;
  quizType?: 'practice' | 'live_contest';
  scheduledStartDateTime?: string;
  scheduledEndDateTime?: string;
  defaultLanguageMode?: 'en' | 'hi' | 'dual';

  // Granular Admin Controls
  enableCertificate?: boolean;
  enableAntiCheating?: boolean;
  maxAttempts?: number;
  timingMode?: 'quiz' | 'sectional' | 'question';
  questionTimeLimitSeconds?: number;
  preventPreviousSectionReturn?: boolean;
  preventEarlyNextSection?: boolean;
  preventPreviousQuestionReturn?: boolean;
  preventEarlyNextQuestion?: boolean;
  sectionalConfig?: Array<{
    id: string;
    sectionName: string;
    questionCount: number;
    timeLimitMinutes: number;
  }>;
  accessCode?: string;
  allowedEmails?: string[];
  questionViewMode?: 'both' | 'single_only' | 'all_only';
  allowManualEarlyMove?: boolean;
  maxTabSwitches?: number;
  resultAnnouncementDateTime?: string;

  questions: ParsedQuestion[];
  errors: string[];
  rawText?: string;
}

export interface ParsedQuestion {
  tempId?: string;
  questionText: string;
  questionEnglish?: string;
  questionHindi?: string;
  options: Option[];
  correctOptionId: string;
  correctOptionIds?: string[];
  questionType?: QuestionType;
  imageUrl?: string;
  listI?: string[];
  listII?: string[];
  explanation?: string;
  explanationEnglish?: string;
  explanationHindi?: string;
  marks?: number;
  isValid?: boolean;
  validationError?: string;
}
