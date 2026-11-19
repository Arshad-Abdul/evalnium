export type QuestionType = 'mcq' | 'multiple_select' | 'match_following';
export type ListOrderStyle = 'alpha_upper' | 'roman_upper' | 'numeric' | 'alpha_lower' | 'roman_lower' | 'bullets' | 'arrows' | 'none';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Option {
  id: string; // e.g., 'A', 'B', 'C', 'D'
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  questionText: string;
  passage?: string; // Optional reading comprehension passage / case study text
  questionEnglish?: string;
  questionHindi?: string;
  options: Option[];
  correctOptionId: string; // 'A', 'B', 'C', 'D'
  correctOptionIds?: string[]; // For Multiple Select Questions (MSQ)
  questionType?: QuestionType;
  imageUrl?: string;
  listI?: string[]; // Match the Following List I items
  listII?: string[]; // Match the Following List II items
  listITitle?: string; // Custom heading for List I e.g. "List I (Name of Canon)"
  listIITitle?: string; // Custom heading for List II e.g. "List II (No. of Canons)"
  listIOrder?: ListOrderStyle; // Numbering / bullet style for List I items (defaults to 'alpha_upper')
  listIIOrder?: ListOrderStyle; // Numbering / bullet style for List II items (defaults to 'roman_upper')
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
  quizType?: 'practice' | 'live_contest' | 'scheduled_unlock'; // 'practice' (24/7 Unlimited) vs 'scheduled_unlock' (Unlocks at time, then Evergreen 24/7) vs 'live_contest' (Strict 1-Time Lock)
  scheduledStartDateTime?: string; // ISO string e.g. "2026-08-10T10:00"
  scheduledEndDateTime?: string; // ISO string e.g. "2026-08-10T12:00"
  defaultLanguageMode?: 'en' | 'hi' | 'dual';
  hasAccessCode?: boolean;
  accessCode?: string;
  allowedEmails?: string[];
  questionCount?: number;
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
  autoEmailResults?: boolean; // Send automated scorecard emails to candidates on result announcement
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
  preventQuestionCopy?: boolean; // Anti-piracy guard: disables question text selection, copying, and right-click during exam
  preventScreenshot?: boolean; // Anti-screenshot guard: blocks PrtScn, Snipping Tool blur shield, Print/PDF blocking
  enableWatermark?: boolean; // Dynamic candidate forensic watermark (Name, Email, UID)

  notifyCandidates?: boolean; // If true, triggers new_exam_alert email broadcast to all candidates upon publishing

  // --- Auto-Publishing & Card Display Engine ---
  publishAt?: string; // ISO string; stays hidden from candidates until this datetime
  customBadge?: string; // Custom badge text override (e.g. "Day 2 Special", "Mega Mock")
  badgeExpiresAt?: string; // ISO string when badge auto-expires and disappears
  showBadge?: boolean; // Card toggle: show/hide badge (default true)
  showCountdown?: boolean; // Card toggle: show/hide countdown timer (default true)
  showDates?: boolean; // Card toggle: show/hide dates on card (default true)

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
  isPublished?: boolean;
  createdAt?: string;
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
  quizType?: 'practice' | 'live_contest' | 'scheduled_unlock';
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
  autoEmailResults?: boolean;
  preventQuestionCopy?: boolean;
  preventScreenshot?: boolean;
  enableWatermark?: boolean;

  publishAt?: string;
  customBadge?: string;
  badgeExpiresAt?: string;
  showBadge?: boolean;
  showCountdown?: boolean;
  showDates?: boolean;

  questions: ParsedQuestion[];
  errors: string[];
  rawText?: string;
}

export interface ParsedQuestion {
  tempId?: string;
  questionText: string;
  passage?: string;
  questionEnglish?: string;
  questionHindi?: string;
  options: Option[];
  correctOptionId: string;
  correctOptionIds?: string[];
  questionType?: QuestionType;
  imageUrl?: string;
  listI?: string[];
  listII?: string[];
  listITitle?: string;
  listIITitle?: string;
  listIOrder?: ListOrderStyle;
  listIIOrder?: ListOrderStyle;
  explanation?: string;
  explanationEnglish?: string;
  explanationHindi?: string;
  marks?: number;
  isValid?: boolean;
  validationError?: string;
}
