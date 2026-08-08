import type { Quiz, QuizAttemptResult } from '../types/quiz';
import type { Announcement } from '../types/announcement';
import { INITIAL_QUIZZES } from '../data/initialQuizzes';

const QUIZZES_KEY = 'evalnium_quizzes_v3';
const RESULTS_KEY = 'evalnium_results_v3';
const ANNOUNCEMENTS_KEY = 'evalnium_announcements_v1';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

// --- QUIZZES CLOUD & LOCAL SYNC ---
export async function syncQuizzesFromMySQL(): Promise<Quiz[] | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/quizzes`);
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
  }).catch(() => {});

  return updated;
}

export function deleteQuiz(id: string): Quiz[] {
  const quizzes = getStoredQuizzes();
  const updated = quizzes.filter(q => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(updated));

  fetch(`${getApiBaseUrl()}/quizzes/${id}`, {
    method: 'DELETE',
  }).catch(() => {});

  return updated;
}

// --- RESULTS & LEADERBOARD CLOUD & LOCAL SYNC ---
export async function syncResultsFromMySQL(): Promise<QuizAttemptResult[] | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/results`);
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
  const updated = [result, ...results];
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
export async function syncAnnouncementsFromMySQL(): Promise<Announcement[] | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/announcements`);
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
