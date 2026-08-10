import type { Quiz, QuizAttemptResult } from '../types/quiz';
import type { Announcement } from '../types/announcement';
import { INITIAL_QUIZZES } from '../data/initialQuizzes';

const QUIZZES_KEY = 'evalnium_quizzes_v3';
const RESULTS_KEY = 'evalnium_results_v3';
export const ANNOUNCEMENTS_KEY = 'evalnium_announcements_v1';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    return isLocalhost ? 'http://localhost:5050/api' : `http://${host}:5050/api`;
  }
  return 'http://localhost:5050/api';
};

const shouldSkipApiCall = () => {
  if (typeof window === 'undefined') return false;
  const skipApiParam = new URLSearchParams(window.location.search).get('skipApi');
  return skipApiParam === '1' || skipApiParam === 'true';
};

// --- QUIZZES CLOUD & LOCAL SYNC ---
export async function syncQuizzesFromMySQL(): Promise<Quiz[] | null> {
  if (shouldSkipApiCall()) return null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/quizzes`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(QUIZZES_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // API server offline fallback
  }
  return null;
}

export function getStoredQuizzes(): Quiz[] {
  try {
    const data = localStorage.getItem(QUIZZES_KEY);
    if (!data) {
      localStorage.setItem(QUIZZES_KEY, JSON.stringify(INITIAL_QUIZZES));
      return INITIAL_QUIZZES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_QUIZZES;
  } catch (err) {
    console.error('Error reading quizzes from storage:', err);
    return INITIAL_QUIZZES;
  }
}

export function saveQuiz(quiz: Quiz): Quiz[] {
  const quizzes = getStoredQuizzes();
  const existingIdx = quizzes.findIndex(q => q.id === quiz.id);
  
  let updated: Quiz[];
  if (existingIdx >= 0) {
    updated = [...quizzes];
    updated[existingIdx] = { ...quiz, updatedAt: new Date().toISOString() };
  } else {
    updated = [quiz, ...quizzes];
  }
  
  try {
    localStorage.setItem(QUIZZES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage limit reached when saving quiz:', e);
  }

  // Push to MySQL Server async
  fetch(`${getApiBaseUrl()}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz),
  }).then(async res => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('❌ MySQL quiz save failed:', res.status, err);
    }
  }).catch(err => {
    console.error('❌ MySQL quiz save network error:', err);
  });

  return updated;
}

export function deleteQuiz(id: string): Quiz[] {
  const quizzes = getStoredQuizzes();
  const updated = quizzes.filter(q => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(updated));

  // Clean up results for deleted quiz
  const results = getStoredResults();
  const cleanedResults = results.filter(r => r.quizId !== id);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(cleanedResults));

  fetch(`${getApiBaseUrl()}/quizzes/${id}`, {
    method: 'DELETE',
  }).catch(() => {});

  return updated;
}

// --- RESULTS & LEADERBOARD CLOUD & LOCAL SYNC ---
export async function syncResultsFromMySQL(): Promise<QuizAttemptResult[] | null> {
  if (shouldSkipApiCall()) return null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/results`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(RESULTS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // API server offline fallback
  }
  return null;
}

export function getStoredResults(): QuizAttemptResult[] {
  try {
    const data = localStorage.getItem(RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading results from storage:', err);
    return [];
  }
}

export function saveResult(result: QuizAttemptResult): QuizAttemptResult[] {
  const results = getStoredResults();
  
  // Check if same candidate has already attempted this quiz (by quizId or title)
  const existingIdx = results.findIndex(
    r => (r.quizId === result.quizId || (r.quizTitle && r.quizTitle === result.quizTitle)) &&
         (r.candidateName.toLowerCase().trim() === result.candidateName.toLowerCase().trim())
  );

  let updated: QuizAttemptResult[];
  if (existingIdx >= 0) {
    const existing = results[existingIdx];
    const newAttemptCount = (existing.attemptsCount || 1) + 1;
    const updatedEntry: QuizAttemptResult = {
      ...result,
      id: existing.id || result.id,
      attemptsCount: newAttemptCount,
      bestScore: Math.max(existing.bestScore || existing.score || 0, result.score),
      bestPercentage: Math.max(existing.bestPercentage || existing.percentage || 0, result.percentage),
    };
    updated = [...results];
    updated[existingIdx] = updatedEntry;
  } else {
    updated = [{ ...result, attemptsCount: 1, bestScore: result.score, bestPercentage: result.percentage }, ...results];
  }

  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage limit reached when saving exam result:', e);
  }

  // Push to MySQL Server async
  fetch(`${getApiBaseUrl()}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  }).catch(() => {});

  return updated;
}

// --- ANNOUNCEMENTS CLOUD & LOCAL SYNC ---
export function getStoredAnnouncements(): Announcement[] {
  try {
    const data = localStorage.getItem(ANNOUNCEMENTS_KEY);
    return data ? JSON.parse(data) : [
      {
        id: 'ann_default_1',
        title: 'UGC NET 2026 Bilingual Mock Series Live Now!',
        message: 'Practice 100+ LIS metric science questions with negative marking & instant explanations.',
        scheduledDateTime: new Date().toISOString(),
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  } catch {
    return [];
  }
}

export async function syncAnnouncementsFromMySQL(): Promise<Announcement[] | null> {
  if (shouldSkipApiCall()) return null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/announcements`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // fallback
  }
  return null;
}

export function saveAnnouncementToCloud(ann: Announcement): void {
  fetch(`${getApiBaseUrl()}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ann),
  }).catch(() => {});
}

export function deleteAnnouncementFromCloud(id: string): void {
  fetch(`${getApiBaseUrl()}/announcements/${id}`, {
    method: 'DELETE',
  }).catch(() => {});
}
