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
    } else if (upper.includes('DAILY') || upper.includes('DAY') || upper.includes('SERIES') || upper.includes('TOPIC')) {
      colorClass = 'bg-indigo-50 text-indigo-800 border-indigo-200/90';
    } else if (upper.includes('MOCK') || upper.includes('MEGA') || upper.includes('GRAND') || upper.includes('FULL')) {
      colorClass = 'bg-blue-50 text-blue-800 border-blue-200/90';
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

  // Detection C: PYQ Papers (Matches: pyq, previous year, 2024 pyq, solved paper)
  if (/\bpyq\b|previous\s*year|solved\s*paper|\b20\d\d\s*pyq\b/i.test(title)) {
    return {
      text: 'PYQ ARCHIVE',
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      isAutoDetected: true,
    };
  }

  // Detection D: Daily Quiz by Title (Matches: daily quiz, day 1, day-2, etc.)
  if (/daily\s*quiz|\bday[\s-]*\d+/i.test(title)) {
    return {
      text: 'DAILY QUIZ',
      colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
      isAutoDetected: true,
    };
  }

  // Detection E: Full Mock / Grand Test
  const qCount = quiz.questionCount ?? (quiz.questions ? quiz.questions.length : 0);
  if (/full\s*mock|grand\s*mock|mega\s*mock|full\s*length/i.test(title) || qCount >= 90) {
    return {
      text: 'FULL MOCK',
      colorClass: 'bg-blue-50 text-blue-800 border-blue-200/90',
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
