import React, { useState, useEffect } from 'react';
import type { Question } from '../../types/quiz';
import { Bookmark, X, BookOpen, Trash2, HelpCircle } from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';
import { getItemPrefix, cleanItemText } from '../../utils/parsers';
import { FormattedQuestionStem } from '../common/FormattedQuestionStem';
import { useAuth } from '../../context/AuthContext';

export interface SavedQuestionEntry {
  id: string;
  quizId?: string;
  quizTitle?: string;
  question: Question;
  bookmarkedAt?: string;
}

interface RevisionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BOOKMARKS_KEY = 'evalnium_bookmarked_questions_v2';
const LEGACY_KEY = 'evalnium_bookmarked_questions_v1';

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return 'http://localhost:5050/api';
};

export function normalizeSavedEntry(item: any): SavedQuestionEntry {
  if (item && item.question && item.question.id) {
    return {
      id: item.question.id,
      quizId: item.quizId || 'exam_quiz',
      quizTitle: item.quizTitle || 'Practice Assessment',
      question: item.question,
      bookmarkedAt: item.bookmarkedAt || new Date().toISOString(),
    };
  }
  return {
    id: item?.id || 'q_unknown',
    quizId: item?.quizId || 'exam_quiz',
    quizTitle: item?.quizTitle || 'Practice Assessment',
    question: item,
    bookmarkedAt: item?.bookmarkedAt || new Date().toISOString(),
  };
}

export function getStoredSavedEntries(): SavedQuestionEntry[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeSavedEntry);
      }
    }
    // Check legacy v1
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw);
      if (Array.isArray(parsedLegacy)) {
        const migrated = parsedLegacy.map(normalizeSavedEntry);
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function getBookmarkedQuestions(): Question[] {
  return getStoredSavedEntries().map((e) => e.question);
}

export function saveBookmarkedQuestion(
  question: Question,
  uid?: string,
  quizId?: string,
  quizTitle?: string
): SavedQuestionEntry[] {
  const existing = getStoredSavedEntries();
  const alreadySaved = existing.some((q) => q.id === question.id);
  if (alreadySaved) return existing;

  const newEntry: SavedQuestionEntry = {
    id: question.id,
    quizId: quizId || 'exam_quiz',
    quizTitle: quizTitle || 'Practice Assessment',
    question,
    bookmarkedAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...existing];
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch { }

  if (uid) {
    fetch(`${getApiBase()}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        uid,
        questionId: question.id,
        quizId: newEntry.quizId,
        quizTitle: newEntry.quizTitle,
        question,
      }),
    }).catch(() => {});
  }
  return updated;
}

export function removeBookmarkedQuestion(qId: string, uid?: string): SavedQuestionEntry[] {
  const existing = getStoredSavedEntries();
  const updated = existing.filter((q) => q.id !== qId);
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch { }

  if (uid) {
    fetch(`${getApiBase()}/bookmarks/${encodeURIComponent(qId)}?uid=${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  }
  return updated;
}

export const RevisionHubModal: React.FC<RevisionHubModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<SavedQuestionEntry[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const local = getStoredSavedEntries();
    setEntries(local);

    // Sync from MySQL if logged in and merge with localStorage
    if (currentUser?.uid) {
      fetch(`${getApiBase()}/bookmarks?uid=${encodeURIComponent(currentUser.uid)}`, {
        credentials: 'include',
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((remote: any[] | null) => {
          if (!remote || !Array.isArray(remote) || remote.length === 0) return;
          const remoteNormalized = remote.map(normalizeSavedEntry);
          const localIds = new Set(local.map((e) => e.id));
          const merged = [...local, ...remoteNormalized.filter((e) => !localIds.has(e.id))];
          localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(merged));
          setEntries(merged);
        })
        .catch(() => {});
    }
  }, [isOpen, currentUser?.uid]);

  if (!isOpen) return null;

  const handleRemove = (qId: string) => {
    const updated = removeBookmarkedQuestion(qId, currentUser?.uid);
    setEntries(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-3xl w-full p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Bookmark className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Student Revision Bank</h3>
              <p className="text-xs text-slate-500 font-medium">Review all your saved bookmarked questions across exams</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No Bookmarked Questions Saved</p>
              <p className="text-xs">Click the 🔖 Bookmark button during live exams or result reviews to save questions here.</p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const q = entry.question;
              return (
              <div key={entry.id} className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center border">
                      Q{idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      📚 {entry.quizTitle || 'Practice Exam'}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {q.topic || 'General Topic'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <AudioPlayerButton textToRead={q.questionEnglish || q.questionText} />
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="p-1.5 rounded text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reading Comprehension Passage */}
                {q.passage && (
                  <div className="my-2 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center space-x-2 text-xs font-bold text-blue-950 uppercase">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reading Comprehension Passage</span>
                    </div>
                    <div className="text-xs text-slate-800 leading-relaxed font-serif max-h-48 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-line border border-blue-100/60 rounded-lg p-2.5 bg-white/80">
                      {q.passage}
                    </div>
                  </div>
                )}

                <FormattedQuestionStem text={q.questionText} className="font-bold text-slate-900 text-sm leading-snug" />

                {/* Question Image / Diagram */}
                {q.imageUrl && (
                  <div className="my-2 rounded-xl overflow-hidden border border-slate-200 shadow-xs max-w-sm bg-slate-50 p-1.5">
                    <img src={q.imageUrl} alt="Question Diagram" className="w-full object-contain max-h-56 rounded-lg" />
                  </div>
                )}

                {/* Match the Following List I vs List II Box */}
                {q.questionType === 'match_following' && (q.listI || q.listII) && (
                  <div className="my-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {q.listI && q.listI.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-indigo-950 font-extrabold block border-b border-indigo-200 pb-1 uppercase tracking-wider text-[11px]">
                            {q.listITitle || 'List I'}
                          </span>
                          {q.listI.map((item, i) => {
                            if (!item) return null;
                            const prefix = getItemPrefix(i, q.listIOrder || 'alpha_upper');
                            const text = cleanItemText(item);
                            return (
                              <div key={i} className="p-2 rounded-lg bg-white border border-indigo-100 font-medium text-slate-800 shadow-2xs text-xs flex items-center gap-1.5">
                                {prefix && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 font-mono font-bold text-indigo-900 text-[11px] shrink-0">
                                    {prefix}
                                  </span>
                                )}
                                <span>{text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.listII && q.listII.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-indigo-950 font-extrabold block border-b border-indigo-200 pb-1 uppercase tracking-wider text-[11px]">
                            {q.listIITitle || 'List II'}
                          </span>
                          {q.listII.map((item, i) => {
                            if (!item) return null;
                            const prefix = getItemPrefix(i, q.listIIOrder || 'roman_upper');
                            const text = cleanItemText(item);
                            return (
                              <div key={i} className="p-2 rounded-lg bg-white border border-indigo-100 font-medium text-slate-800 shadow-2xs text-xs flex items-center gap-1.5">
                                {prefix && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 font-mono font-bold text-indigo-900 text-[11px] shrink-0">
                                    {prefix}
                                  </span>
                                )}
                                <span>{text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
                        opt.id === q.correctOptionId
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center ${
                        opt.id === q.correctOptionId ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.id}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200 text-slate-800 font-medium space-y-1">
                  <span className="font-bold text-blue-900 flex items-center space-x-1">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Explanation Rationale:</span>
                  </span>
                  <p>{q.explanation || `Option (${q.correctOptionId}) is correct.`}</p>
                </div>
              </div>
            );
          })
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs"
          >
            Close Revision Bank
          </button>
        </div>

      </div>
    </div>
  );
};
