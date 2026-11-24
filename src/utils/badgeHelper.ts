import type { Quiz } from '../types/quiz';

export interface SmartBadgeResult {
  text: string;
  colorClass: string;
  isAutoDetected: boolean;
}

/**
 * Resolves the appropriate smart badge for a quiz based on:
 * 1. Admin showBadge toggle (returns null if disabled)
 * 2. Auto-expiry check (returns null if expired)
 * 3. Custom badge override (highest priority if set)
 * 4. Automatic smart detection based on quizType, title, question count, or recency
 */
export function resolveSmartBadge(quiz?: Partial<Quiz> | null): SmartBadgeResult | null {
  if (!quiz) return null;

  // 1. If Admin explicitly turned off badge
  if (quiz.showBadge === false) {
    return null;
  }

  // 2. Check Auto-Expiry
  if (quiz.badgeExpiresAt) {
    const expireMs = new Date(quiz.badgeExpiresAt).getTime();
    if (!isNaN(expireMs) && Date.now() >= expireMs) {
      return null;
    }
  }

  // 3. Custom Badge Override (If set by Admin)
  if (quiz.customBadge && quiz.customBadge.trim() !== '') {
    const text = quiz.customBadge.trim();
    const upper = text.toUpperCase();

    // Assign appropriate institutional color scheme based on tone
    let colorClass = 'bg-slate-100 text-slate-800 border-slate-300/80';
    if (upper.includes('NEW') || upper.includes('FRESH') || upper.includes('HOT') || upper.includes('ALERT')) {
      colorClass = 'bg-rose-50 text-rose-800 border-rose-200/90';
    } else if (upper.includes('PYQ') || upper.includes('PREVIOUS') || upper.includes('SOLVED') || upper.includes('EXAM')) {
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
    } else if (upper.includes('CONTEST') || upper.includes('LIVE') || upper.includes('CHAMPION') || upper.includes('SCHOLARSHIP')) {
      colorClass = 'bg-amber-50 text-amber-800 border-amber-200/90';
    } else if (upper.includes('DAILY') || upper.includes('DAY') || upper.includes('SERIES')) {
      colorClass = 'bg-indigo-50 text-indigo-800 border-indigo-200/90';
    } else if (upper.includes('MOCK') || upper.includes('MEGA') || upper.includes('GRAND') || upper.includes('FULL')) {
      colorClass = 'bg-blue-50 text-blue-800 border-blue-200/90';
    } else if (upper.includes('TOPIC') || upper.includes('CHAPTER') || upper.includes('UNIT')) {
      colorClass = 'bg-teal-50 text-teal-800 border-teal-200/90';
    }

    return {
      text,
      colorClass,
      isAutoDetected: false,
    };
  }

  // 4. Automatic Smart Detection Engine
  const title = (quiz.title || '').toLowerCase();
  const quizType = quiz.quizType || 'practice';

  // Detection A: Live Contest
  if (quizType === 'live_contest') {
    return {
      text: 'LIVE CONTEST',
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
      isAutoDetected: true,
    };
  }

  // Detection B: Scheduled Daily Quiz
  if (quizType === 'scheduled_unlock') {
    return {
      text: 'DAILY QUIZ',
      colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
      isAutoDetected: true,
    };
  }

  // Detection B2: Practice Quiz (No Ranking)
  if (quizType === 'unranked_practice') {
    return {
      text: 'PRACTICE QUIZ',
      colorClass: 'bg-teal-50 text-teal-800 border-teal-200/90',
      isAutoDetected: true,
    };
  }

  // Detection C: Daily Quiz by Title (Matches: daily quiz, day 1, day-2, etc.)
  if (/daily\s*quiz|\bday[\s-]*\d+/i.test(title)) {
    return {
      text: 'DAILY QUIZ',
      colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
      isAutoDetected: true,
    };
  }

  // Detection D: PYQ Papers (Matches: pyq, previous year, 2024 pyq, solved paper)
  if (/\bpyq\b|previous\s*year|solved\s*paper|\b20\d\d\s*pyq\b/i.test(title)) {
    return {
      text: 'PYQ ARCHIVE',
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      isAutoDetected: true,
    };
  }

  // Detection E: Full Mock / Grand Test (Strictly title-based)
  if (/\bfull\s*mock\b|\bgrand\s*mock\b|\bmock\s*test\b|\bmega\s*mock\b|\bfull\s*length\b/i.test(title)) {
    return {
      text: 'FULL MOCK',
      colorClass: 'bg-blue-50 text-blue-800 border-blue-200/90',
      isAutoDetected: true,
    };
  }

  // Detection F: Topic / Chapter Test
  if (/topic\s*test|chapter\s*test|unit\s*test/i.test(title)) {
    return {
      text: 'TOPIC TEST',
      colorClass: 'bg-teal-50 text-teal-800 border-teal-200/90',
      isAutoDetected: true,
    };
  }

  // Detection F: New Test (Created within last 72 hours)
  if (quiz.createdAt) {
    const createdMs = new Date(quiz.createdAt).getTime();
    const threeDaysMs = 72 * 60 * 60 * 1000;
    if (!isNaN(createdMs) && Date.now() - createdMs < threeDaysMs) {
      return {
        text: 'NEW',
        colorClass: 'bg-rose-50 text-rose-800 border-rose-200/90',
        isAutoDetected: true,
      };
    }
  }

  return null;
}

export interface CardAccentResult {
  topStripClass: string;
  leftStripClass: string;
}

/**
 * Resolves the top accent strip color for cards (Option A)
 * based on exam mode, title tags, and custom badge.
 */
export function getQuizCardAccent(quiz?: Partial<Quiz> | null): CardAccentResult {
  if (!quiz) {
    return {
      topStripClass: 'bg-slate-300',
      leftStripClass: 'border-l-slate-300',
    };
  }

  const quizType = quiz.quizType || 'practice';

  // 1. Strict Live Contest (Amber)
  if (quizType === 'live_contest') {
    return {
      topStripClass: 'bg-amber-500',
      leftStripClass: 'border-l-amber-500',
    };
  }

  // 1b. Practice Quiz (No Ranking) (Teal)
  if (quizType === 'unranked_practice') {
    return {
      topStripClass: 'bg-teal-600',
      leftStripClass: 'border-l-teal-600',
    };
  }

  // 2. Scheduled Unlock or Daily Quiz series (Indigo)
  const title = (quiz.title || '').toLowerCase();
  if (quizType === 'scheduled_unlock' || /daily\s*quiz|\bday[\s-]*\d+/i.test(title)) {
    return {
      topStripClass: 'bg-indigo-600',
      leftStripClass: 'border-l-indigo-600',
    };
  }

  // 3. Custom Badge Override Check
  if (quiz.customBadge && quiz.customBadge.trim() !== '') {
    const upper = quiz.customBadge.toUpperCase();
    if (upper.includes('NEW') || upper.includes('HOT') || upper.includes('ALERT')) {
      return { topStripClass: 'bg-rose-500', leftStripClass: 'border-l-rose-500' };
    }
    if (upper.includes('PYQ') || upper.includes('PREVIOUS')) {
      return { topStripClass: 'bg-emerald-600', leftStripClass: 'border-l-emerald-600' };
    }
    if (upper.includes('MOCK') || upper.includes('GRAND')) {
      return { topStripClass: 'bg-blue-600', leftStripClass: 'border-l-blue-600' };
    }
    if (upper.includes('TOPIC') || upper.includes('CHAPTER')) {
      return { topStripClass: 'bg-teal-600', leftStripClass: 'border-l-teal-600' };
    }
    if (upper.includes('CONTEST')) {
      return { topStripClass: 'bg-amber-500', leftStripClass: 'border-l-amber-500' };
    }
  }

  // 4. PYQ Archive (Emerald)
  if (/\bpyq\b|previous\s*year|solved\s*paper|\b20\d\d\s*pyq\b/i.test(title)) {
    return {
      topStripClass: 'bg-emerald-600',
      leftStripClass: 'border-l-emerald-600',
    };
  }

  // 5. Full Mock / Grand Test (Strictly title-based)
  if (/\bfull\s*mock\b|\bgrand\s*mock\b|\bmock\s*test\b|\bmega\s*mock\b|\bfull\s*length\b/i.test(title)) {
    return {
      topStripClass: 'bg-blue-600',
      leftStripClass: 'border-l-blue-600',
    };
  }

  // 6. Topic / Chapter Test (Teal)
  if (/topic\s*test|chapter\s*test|unit\s*test/i.test(title)) {
    return {
      topStripClass: 'bg-teal-600',
      leftStripClass: 'border-l-teal-600',
    };
  }

  // 7. Standard Practice Paper (Subtle Slate Bar)
  return {
    topStripClass: 'bg-slate-300',
    leftStripClass: 'border-l-slate-300',
  };
}

export interface QuizTypeDescriptor {
  label: string;
  shortBadge: string;
  description: string;
  badgeColorClass: string;
  dotColorClass: string;
}

/**
 * Resolves the institutional quiz type descriptor (title, badge, description)
 * for use under quiz headings across the Exam Header, Quiz Cards, and Modals.
 */
export function getQuizTypeDescriptor(quiz?: Partial<Quiz> | { [key: string]: any } | null): QuizTypeDescriptor {
  if (!quiz) {
    return {
      label: 'Practice Quiz',
      shortBadge: 'PRACTICE QUIZ',
      description: 'Standard Practice Paper',
      badgeColorClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotColorClass: 'bg-slate-400',
    };
  }

  const quizType = quiz.quizType || 'practice';

  if (quizType === 'live_contest') {
    return {
      label: 'Strict Live Contest',
      shortBadge: 'LIVE CONTEST',
      description: 'Official Live Contest • Single Attempt Only',
      badgeColorClass: 'bg-amber-50 text-amber-800 border-amber-300',
      dotColorClass: 'bg-amber-500',
    };
  }

  if (quizType === 'scheduled_unlock') {
    return {
      label: 'Scheduled Daily Quiz',
      shortBadge: 'DAILY QUIZ',
      description: 'Daily Quiz • Timed Practice',
      badgeColorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      dotColorClass: 'bg-indigo-500',
    };
  }

  if (quizType === 'unranked_practice') {
    return {
      label: 'Practice Quiz (No Ranking)',
      shortBadge: 'PRACTICE QUIZ',
      description: 'Practice Mode • Untimed & Unlimited Practice',
      badgeColorClass: 'bg-teal-50 text-teal-800 border-teal-200',
      dotColorClass: 'bg-teal-500',
    };
  }

  // Regular practice or 24/7 mock
  const isUntimed = Number(quiz.timeLimitMinutes || 0) === 0;
  return {
    label: isUntimed ? 'Untimed Practice Quiz' : 'Timed Practice Mock',
    shortBadge: 'PRACTICE QUIZ',
    description: isUntimed ? 'Unlimited Practice • No Cutoff' : `${quiz.timeLimitMinutes} min Practice Paper`,
    badgeColorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotColorClass: 'bg-emerald-500',
  };
}

