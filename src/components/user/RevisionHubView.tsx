import React, { useState, useEffect, useMemo } from 'react';
import type { Quiz, Question } from '../../types/quiz';
import {
  Bookmark,
  Search,
  BookOpen,
  Trash2,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Cloud,
  RefreshCw,
  LogIn,
  Lock,
} from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';
import { FormattedQuestionStem } from '../common/FormattedQuestionStem';
import { useAuth } from '../../context/AuthContext';
import {
  getStoredSavedEntries,
  removeBookmarkedQuestion,
  normalizeSavedEntry,
  getBookmarksKey,
  type SavedQuestionEntry,
} from './RevisionHubModal';

interface RevisionHubViewProps {
  quizzes: Quiz[];
  onNavigateToCatalog: () => void;
  onSelectQuiz: (quiz: Quiz) => void;
  onRequireAuth?: () => void;
  onNavigateToDoubts?: (quizId?: string, questionId?: string) => void;
}

const BOOKMARKS_KEY = 'evalnium_bookmarked_questions_v2';

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return 'http://localhost:5050/api';
};

export const RevisionHubView: React.FC<RevisionHubViewProps> = ({
  quizzes,
  onNavigateToCatalog,
  onSelectQuiz,
  onRequireAuth,
  onNavigateToDoubts,
}) => {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<SavedQuestionEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all');
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  const fetchCloudBookmarks = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/bookmarks?uid=${encodeURIComponent(currentUser.uid)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          const remoteNormalized = remote.map(normalizeSavedEntry);
          localStorage.setItem(getBookmarksKey(currentUser.uid), JSON.stringify(remoteNormalized));
          setEntries(remoteNormalized);
          setIsCloudSynced(true);
        }
      }
    } catch (e) {
      console.warn('Could not sync bookmarks from server:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      const userCached = getStoredSavedEntries(currentUser.uid);
      setEntries(userCached);
      fetchCloudBookmarks();
    } else {
      setEntries([]);
      setIsCloudSynced(false);
    }
  }, [currentUser?.uid]);

  const handleRemove = (qId: string) => {
    const updated = removeBookmarkedQuestion(qId, currentUser?.uid);
    setEntries(updated);
  };

  const handleClearAll = () => {
    if (!confirm('Are you sure you want to remove all saved questions from your Revision Bank?')) {
      return;
    }
    entries.forEach((e) => {
      removeBookmarkedQuestion(e.id, currentUser?.uid);
    });
    setEntries([]);
  };

  // Groupings by Quiz Title for Filter Bar
  const quizFilterOptions = useMemo(() => {
    const counts: Record<string, { title: string; count: number }> = {};
    entries.forEach((e) => {
      const title = e.quizTitle || 'Practice Assessment';
      if (!counts[title]) {
        counts[title] = { title, count: 0 };
      }
      counts[title].count += 1;
    });
    return Object.values(counts);
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Paper filter
      if (selectedQuizFilter !== 'all' && (e.quizTitle || 'Practice Assessment') !== selectedQuizFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const qStem = (e.question.questionEnglish || e.question.questionText || '').toLowerCase();
        const qHindi = (e.question.questionHindi || '').toLowerCase();
        const qTopic = (e.question.topic || '').toLowerCase();
        const pTitle = (e.quizTitle || '').toLowerCase();
        return (
          qStem.includes(q) ||
          qHindi.includes(q) ||
          qTopic.includes(q) ||
          pTitle.includes(q) ||
          String(e.id).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, selectedQuizFilter, searchQuery]);

  if (!currentUser) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 px-4 text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
          <Bookmark className="w-8 h-8 fill-amber-500 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Sign In to Access Your Revision Bank</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your saved questions are private and permanently synchronized to your personal candidate account in MySQL database. Please sign in to view and practice your saved questions.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Your Account</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-150">
      
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Back to Exam Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Student Revision Bank</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 font-mono">
                {entries.length} Saved Question{entries.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Review, listen to, and practice all your bookmarked questions across mock tests and past papers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cloud Synced</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onRequireAuth}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer transition-colors"
              title="Sign in to save your questions permanently across all devices"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Sign In to Sync</span>
            </button>
          )}

          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
        
        {/* Horizontal Paper Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedQuizFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              selectedQuizFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Papers ({entries.length})
          </button>

          {quizFilterOptions.map((opt) => (
            <button
              key={opt.title}
              type="button"
              onClick={() => setSelectedQuizFilter(opt.title)}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedQuizFilter === opt.title
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>📚 {opt.title}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                selectedQuizFilter === opt.title ? 'bg-white/20' : 'bg-slate-200 text-slate-800'
              }`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved questions by keywords, topic, or paper name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-900"
          />
        </div>
      </div>

      {/* Questions List */}
      {entries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-6 space-y-3">
          <BookOpen className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Your Revision Bank is Empty</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            While attempting live mock tests or reviewing your submitted scorecards, click the <strong>🔖 Bookmark</strong> button on any tricky question to save it here for targeted revision before your actual exam.
          </p>
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Explore Exam Catalog</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 space-y-2">
          <Search className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No Questions Match Your Filter</p>
          <p className="text-[11px] text-slate-400">
            Try resetting your search query or selecting "All Papers" above.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedQuizFilter('all');
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry, idx) => {
            const q = entry.question;
            const matchedQuiz = quizzes.find(
              (quiz) => quiz.id === entry.quizId || quiz.title === entry.quizTitle
            );

            return (
              <div
                key={entry.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-2xs hover:border-slate-300 transition-all"
              >
                {/* Header Row: Q Number + Exam Paper Title + Topic + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded bg-slate-100 text-slate-800 font-mono font-bold text-xs flex items-center justify-center border border-slate-200">
                      Q{idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      📚 {entry.quizTitle || 'Practice Assessment'}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      🏷️ {q.topic || 'Library and Information Science'}
                    </span>
                    {entry.bookmarkedAt && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Saved {new Date(entry.bookmarkedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <AudioPlayerButton textToRead={q.questionEnglish || q.questionText || ''} />
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                      title="Remove from Revision Bank"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reading Comprehension Passage */}
                {q.passage && (
                  <div className="my-2 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-3 space-y-1.5 shadow-2xs text-xs">
                    <div className="flex items-center space-x-2 text-xs font-bold text-blue-950 uppercase">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reading Comprehension Passage</span>
                    </div>
                    <div className="text-slate-800 leading-relaxed font-serif whitespace-pre-line text-xs pl-2 border-l-2 border-blue-400">
                      {q.passage}
                    </div>
                  </div>
                )}

                {/* Question Stem (Formatted with bilingual & math support) */}
                <div className="text-xs text-slate-900 leading-relaxed font-semibold space-y-1.5">
                  <FormattedQuestionStem
                    text={q.questionEnglish || q.questionText || ''}
                  />
                  {q.questionHindi && (
                    <div className="text-slate-600 pt-1.5 border-t border-slate-100 font-normal text-xs leading-relaxed">
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mr-1">HI</span>
                      {q.questionHindi}
                    </div>
                  )}
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt) => {
                    const isCorrect = opt.id === q.correctOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                        {isCorrect && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Rationale */}
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-800 text-xs font-medium space-y-1">
                  <div className="font-bold text-blue-900 flex items-center space-x-1">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Explanation &amp; Concept Rationale:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 pl-4 border-l border-blue-300">
                    {q.explanation || `Option (${q.correctOptionId}) is the verified correct answer according to official answer keys.`}
                  </p>
                </div>

                {/* Card Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    {onNavigateToDoubts && (
                      <button
                        type="button"
                        onClick={() => onNavigateToDoubts(entry.quizId, entry.id)}
                        className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Discuss in Doubts Hub</span>
                      </button>
                    )}
                  </div>

                  {matchedQuiz && (
                    <button
                      type="button"
                      onClick={() => onSelectQuiz(matchedQuiz)}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      <span>Take Full Paper</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

