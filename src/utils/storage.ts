import type { Quiz, QuizAttemptResult } from '../types/quiz';
import { INITIAL_QUIZZES } from '../data/initialQuizzes';

const QUIZZES_KEY = 'lis_quiz_app_quizzes_v1';
const RESULTS_KEY = 'lis_quiz_app_results_v1';

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
    console.error('Error reading quizzes from LocalStorage:', err);
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
  
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteQuiz(id: string): Quiz[] {
  const quizzes = getStoredQuizzes();
  const updated = quizzes.filter(q => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(updated));
  return updated;
}

export function resetQuizzesToDefault(): Quiz[] {
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(INITIAL_QUIZZES));
  return INITIAL_QUIZZES;
}

export function getStoredResults(): QuizAttemptResult[] {
  try {
    const data = localStorage.getItem(RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading results from LocalStorage:', err);
    return [];
  }
}

export function saveResult(result: QuizAttemptResult): QuizAttemptResult[] {
  const results = getStoredResults();
  const updated = [result, ...results];
  localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
  return updated;
}

export function clearUserHistory(): void {
  localStorage.removeItem(RESULTS_KEY);
}
