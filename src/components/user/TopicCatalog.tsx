import React, { useState, lazy, Suspense } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { Search, BookOpen, Clock, Play, History, X, Lock, Award, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HeroBannerCarousel } from '../home/HeroBannerCarousel';
import { CatalogAdCard } from './CatalogAdCard';

const CertificateModal = lazy(() => import('./CertificateModal').then(m => ({ default: m.CertificateModal })));

interface TopicCatalogProps {
  quizzes: Quiz[];
  attemptsHistory: QuizAttemptResult[];
  onSelectQuiz: (quiz: Quiz) => void;
  onRequireAuth?: () => void;
}

export const TopicCatalog: React.FC<TopicCatalogProps> = ({
  quizzes,
  attemptsHistory,
  onSelectQuiz,
  onRequireAuth,
}) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedCertAttempt, setSelectedCertAttempt] = useState<QuizAttemptResult | null>(null);

  const handleStartExamAttempt = (quiz: Quiz) => {
    onSelectQuiz(quiz);
  };

  const renderQuizAction = (quiz: Quiz, quizAttempts: QuizAttemptResult[], compact = false) => {
    const isContest = quiz.quizType === 'live_contest';
    const hasAttempted = quizAttempts.length > 0;
    const widthClass = compact ? 'px-3.5 py-2 shrink-0 whitespace-nowrap' : 'w-full py-2.5';

    if (isContest) {
      const now = new Date();
      const startDate = quiz.scheduledStartDateTime ? new Date(quiz.scheduledStartDateTime) : null;
      const endDate = quiz.scheduledEndDateTime ? new Date(quiz.scheduledEndDateTime) : null;

      if (hasAttempted) {
        return (
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className={`${compact ? 'px-3 py-2 shrink-0 whitespace-nowrap' : 'w-full py-2'} rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>{compact ? 'Scorecard' : 'Submitted · View Scorecard'}</span>
          </button>
        );
      }

      if (startDate && now < startDate) {
        return (
          <div className={`${compact ? 'px-3 py-2 shrink-0 max-w-[190px]' : 'w-full py-2 px-2'} rounded-lg bg-amber-50 text-amber-800 font-semibold text-xs border border-amber-200 flex items-center justify-center gap-1.5 text-center`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Starts {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      }

      if (endDate && now > endDate) {
        return (
          <div className={`${compact ? 'px-3 py-2 shrink-0 whitespace-nowrap' : 'w-full py-2'} rounded-lg bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200 flex items-center justify-center gap-1.5 text-center`}>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Contest Ended</span>
          </div>
        );
      }

      return (
        <button
          type="button"
          onClick={() => handleStartExamAttempt(quiz)}
          className={`${widthClass} rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer`}
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Enter Contest</span>
        </button>
      );
    }

    const attemptsExhausted = Boolean(quiz.maxAttempts && quiz.maxAttempts > 0 && quizAttempts.length >= quiz.maxAttempts);

    return (
      <button
        type="button"
        onClick={() => handleStartExamAttempt(quiz)}
        disabled={attemptsExhausted}
        className={`${widthClass} rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          currentUser
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-slate-900 hover:bg-slate-800 text-white'
        }`}
      >
        {currentUser ? (
          <>
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{attemptsExhausted ? 'Attempt Limit Reached' : hasAttempted ? 'Retake Test' : 'Start Test'}</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In to Start</span>
          </>
        )}
      </button>
    );
  };

  const myAttempts = attemptsHistory.filter(attempt => {
    if (!currentUser) return false;
    const matchEmail = currentUser.email && attempt.candidateEmail && attempt.candidateEmail.toLowerCase() === currentUser.email.toLowerCase();
    const matchName = currentUser.name && attempt.candidateName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    return matchEmail || matchName;
  });

  const normalizeTopic = (value?: string) => (value || '').replace(/\s+/g, ' ').trim();
  const topics = ['All', ...Array.from(new Set(quizzes.map(q => normalizeTopic(q.topic)).filter(Boolean)))];
  const publishedQuizzes = quizzes.filter(q => {
    if (!q.isPublished) return false;
    if (q.allowedEmails && q.allowedEmails.length > 0) {
      if (!currentUser || !currentUser.email) return false;
      const lowerEmails = q.allowedEmails.map(e => e.toLowerCase());
      if (!lowerEmails.includes(currentUser.email.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const filteredQuizzes = publishedQuizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      normalizeTopic(quiz.topic).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'All' || normalizeTopic(quiz.topic) === selectedTopic;
    const effectiveDifficulty = quiz.difficulty || 'Medium';
    const matchesDifficulty = selectedDifficulty === 'All' || effectiveDifficulty === selectedDifficulty;
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Dynamic Hero Showcase Carousel */}
      <HeroBannerCarousel quizzes={publishedQuizzes} onSelectQuiz={handleStartExamAttempt} />

      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Examination Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {publishedQuizzes.length} {publishedQuizzes.length === 1 ? 'paper' : 'papers'} available for practice and timed assessment
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              onRequireAuth?.();
              return;
            }
            setShowHistoryModal(true);
          }}
          className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span>My Scorecards</span>
          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
            {myAttempts.length}
          </span>
        </button>
      </div>

      {/* Unified Search & Filter Strip */}
      <div className="portal-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search exams by title or subject..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Difficulty Filter & View Mode Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70 overflow-x-auto max-w-full no-scrollbar">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDifficulty === diff
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg border border-slate-200/70 shrink-0" role="group" aria-label="Layout view">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Compact list view"
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Subject Filter Strip */}
        {topics.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 border-t border-slate-100 no-scrollbar">
            <span className="text-[11px] font-medium text-slate-400 mr-1 shrink-0">Subject:</span>
            {topics.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTopic(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTopic === t
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exam Cards Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="portal-card p-10 sm:p-12 text-center space-y-2.5">
          <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-900">No matching test papers</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try clearing your search or switching subject and difficulty filters.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="portal-card divide-y divide-slate-100 overflow-hidden">
          {filteredQuizzes.map((quiz) => {
            const difficulty = quiz.difficulty || 'Medium';
            const difficultyDot =
              difficulty === 'Easy'
                ? 'bg-emerald-500'
                : difficulty === 'Hard'
                  ? 'bg-rose-500'
                  : 'bg-amber-500';
            const quizAttempts = myAttempts.filter((a) => a.quizId === quiz.id);
            const bestAttempt = quizAttempts.reduce<QuizAttemptResult | null>(
              (best, curr) => (!best || curr.percentage > best.percentage ? curr : best),
              null
            );

            return (
              <div key={quiz.id} className="p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-medium text-slate-500">{quiz.topic}</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${difficultyDot}`} />
                      {difficulty}
                    </span>
                    {quiz.quizType === 'live_contest' && (
                      <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                        Contest
                      </span>
                    )}
                    {bestAttempt && (
                      <span className={`font-mono font-semibold px-1.5 py-0.2 rounded border ${
                        bestAttempt.passed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        Best: {bestAttempt.percentage}%
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 truncate">
                    {quiz.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono tabular-nums">
                    <span>{quiz.questionCount ?? quiz.questions.length} Qs</span>
                    <span>·</span>
                    <span>{quiz.timeLimitMinutes} min</span>
                    <span>·</span>
                    <span>Pass: {quiz.passingPercentage ?? 40}%</span>
                    {Number(quiz.negativeMarks) > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-rose-600">Neg: -{quiz.negativeMarks}</span>
                      </>
                    )}
                  </div>
                </div>

                {renderQuizAction(quiz, quizAttempts, true)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredQuizzes.map((quiz, index) => {
            const adInsertIndex = filteredQuizzes.length >= 5 ? 4 : Math.floor(filteredQuizzes.length / 2);
            const difficulty = quiz.difficulty || 'Medium';
            const difficultyDot =
              difficulty === 'Easy'
                ? 'bg-emerald-500'
                : difficulty === 'Hard'
                  ? 'bg-rose-500'
                  : 'bg-amber-500';
            const quizAttempts = myAttempts.filter((a) => a.quizId === quiz.id);
            const bestAttempt = quizAttempts.reduce<QuizAttemptResult | null>(
              (best, curr) => (!best || curr.percentage > best.percentage ? curr : best),
              null
            );

            return (
              <React.Fragment key={quiz.id}>
                {index === adInsertIndex && (
                  <CatalogAdCard
                    quizzes={quizzes}
                    onSelectQuiz={onSelectQuiz}
                  />
                )}
                <div className="portal-card-interactive p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    {/* Clean Metadata Line */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-500 truncate">
                        {quiz.topic}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {bestAttempt && (
                          <span className={`font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded border ${
                            bestAttempt.passed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            Best: {bestAttempt.percentage}%
                          </span>
                        )}
                        {quiz.quizType === 'live_contest' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Contest
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <span className={`w-1.5 h-1.5 rounded-full ${difficultyDot}`} />
                          {difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Paper Title & Summary */}
                    <div>
                      <h3 className="font-bold text-[15px] text-slate-900 leading-snug line-clamp-2">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                        {quiz.description || 'Timed multiple-choice practice paper.'}
                      </p>
                    </div>
                  </div>

                  {/* Specs & Action Button */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-mono tabular-nums">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          <span>{quiz.questionCount ?? quiz.questions.length} Qs</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{quiz.timeLimitMinutes} min</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Pass {quiz.passingPercentage ?? 40}%</span>
                        {Number(quiz.negativeMarks) > 0 && (
                          <span className="text-rose-600 font-semibold">-{quiz.negativeMarks} neg</span>
                        )}
                      </div>
                    </div>

                    {renderQuizAction(quiz, quizAttempts)}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Candidate Scorecard History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full p-5 sm:p-6 rounded-xl border border-slate-200 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Your Scorecards</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close scorecards"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 text-xs">
              {myAttempts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No attempts recorded yet for {currentUser?.name || 'this account'}.
                </div>
              ) : (
                myAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">{attempt.quizTitle}</h4>
                      <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                        {new Date(attempt.attemptedAt).toLocaleDateString()} · {attempt.candidateName}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                          attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {attempt.percentage}% ({attempt.passed ? 'Passed' : 'Below Pass'})
                      </span>
                      <p className="text-[11px] font-mono text-slate-500">
                        {attempt.score} / {attempt.maxScore}
                      </p>

                      {attempt.passed && quizzes.find(q => q.id === attempt.quizId)?.enableCertificate !== false && (
                        <button
                          type="button"
                          onClick={() => setSelectedCertAttempt(attempt)}
                          className="text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Award className="w-3 h-3" />
                          <span>Certificate</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official QR-Verifiable Certificate Modal */}
      {selectedCertAttempt && (
        <Suspense fallback={null}>
          <CertificateModal
            result={selectedCertAttempt}
            onClose={() => setSelectedCertAttempt(null)}
          />
        </Suspense>
      )}
    </div>
  );
};
