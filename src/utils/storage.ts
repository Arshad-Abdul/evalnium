import type { Quiz, QuizAttemptResult } from '../types/quiz';
import { INITIAL_QUIZZES } from '../data/initialQuizzes';

const QUIZZES_KEY = 'evalnium_quizzes_v3';
const RESULTS_KEY = 'evalnium_results_v3';

const API_BASE_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname || 'localhost'}:5000/api`
  : 'http://localhost:5000/api';

// Sync with MySQL Database Server asynchronously
export async function syncQuizzesFromMySQL(): Promise<Quiz[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/quizzes`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
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
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_QUIZZES;
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
  fetch(`${API_BASE_URL}/quizzes`, {
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

  fetch(`${API_BASE_URL}/quizzes/${id}`, {
    method: 'DELETE',
  }).catch(() => {});

  return updated;
}

export function resetQuizzesToDefault(): Quiz[] {
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(INITIAL_QUIZZES));
  return INITIAL_QUIZZES;
}

export async function syncResultsFromMySQL(): Promise<QuizAttemptResult[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/results`);
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
  fetch(`${API_BASE_URL}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  }).catch(() => {});

  return updated;
}

export function clearUserHistory(): void {
  localStorage.removeItem(RESULTS_KEY);
}
