import React, { useState, useEffect } from 'react';
import { X, Bookmark, BookOpen, Clock, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FormattedQuestionStem } from '../common/FormattedQuestionStem';

interface SavedQuestionItem {
  id: string;
  uid: string;
  candidateName?: string;
  candidateEmail?: string | null;
  quizId: string;
  quizTitle: string;
  question: any;
  bookmarkedAt: string;
}

interface CandidateBookmarksModalProps {
  candidateName: string;
  candidateEmail?: string | null;
  candidateUid?: string | null;
  onClose: () => void;
}

export const CandidateBookmarksModal: React.FC<CandidateBookmarksModalProps> = ({
  candidateName,
  candidateEmail,
  candidateUid,
  onClose,
}) => {
  const [bookmarks, setBookmarks] = useState<SavedQuestionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookmarks = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = candidateUid
          ? `/api/bookmarks?uid=${encodeURIComponent(candidateUid)}`
          : `/api/bookmarks?all=true`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          throw new Error('Failed to load candidate bookmarks from server.');
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          // If filtering by email/name when no direct UID
          const filtered = candidateEmail
            ? data.filter((b: any) => !b.candidateEmail || b.candidateEmail.toLowerCase() === candidateEmail.toLowerCase())
            : data;
          setBookmarks(filtered);
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching saved questions.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [candidateUid, candidateEmail]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-w-4xl w-full mx-auto h-full overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center font-bold">
              <Bookmark className="w-5 h-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Candidate Revision Bank
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {bookmarks.length} Saved
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Candidate: <strong className="text-slate-800">{candidateName}</strong> {candidateEmail ? `(${candidateEmail})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shadow-xs border border-slate-200 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Querying MySQL Revision Bank for candidate bookmarks...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Saved Questions</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                This candidate has not saved or bookmarked any exam questions to their Revision Bank yet.
              </p>
            </div>
          ) : (
            bookmarks.map((bm, idx) => {
              const q = bm.question || {};
              return (
                <div key={bm.id || idx} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                  {/* Paper Title & Bookmark Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold font-mono text-[11px]">
                        Q.{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {bm.quizTitle || 'Practice Exam'}
                      </span>
                      {q.topic && (
                        <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">
                          • {q.topic}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Saved {new Date(bm.bookmarkedAt).toLocaleDateString()} at {new Date(bm.bookmarkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Reading Passage if available */}
                  {q.passage && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 space-y-1 text-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-blue-950 uppercase text-[10px]">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Reading Comprehension Passage</span>
                      </div>
                      <div className="text-slate-800 leading-relaxed font-serif max-h-36 overflow-y-auto whitespace-pre-line p-2 bg-white rounded-lg border border-blue-100">
                        {q.passage}
                      </div>
                    </div>
                  )}

                  {/* Question Stem */}
                  <FormattedQuestionStem text={q.questionText || q.questionEnglish || ''} className="text-sm font-semibold text-slate-900 leading-relaxed" />

                  {/* Options */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {q.options.map((opt: any, oIdx: number) => {
                        const isCorrect = q.correctOptionIds ? q.correctOptionIds.includes(opt.id) : q.correctOptionId === opt.id;
                        const letter = ['A', 'B', 'C', 'D', 'E', 'F'][oIdx] || opt.id;
                        return (
                          <div
                            key={opt.id || oIdx}
                            className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded font-mono font-bold text-[11px] flex items-center justify-center shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
                            }`}>
                              {letter}
                            </span>
                            <span className="pt-0.5 leading-snug flex-1">{opt.text}</span>
                            {isCorrect && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-bold text-[9px] uppercase tracking-wide">
                                Key ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  {(q.explanation || q.explanationEnglish || q.explanationHindi) && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">Concept Rationale:</span>
                      <p className="leading-relaxed whitespace-pre-line text-slate-600">{q.explanation || q.explanationEnglish || q.explanationHindi}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

