import React, { useState } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { Search, BookOpen, Clock, Play, History, Filter, X, Lock, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HeroBannerCarousel } from '../home/HeroBannerCarousel';
import { HeaderAdBanner } from '../home/HeaderAdBanner';
import { CertificateModal } from './CertificateModal';

interface TopicCatalogProps {
  quizzes: Quiz[];
  attemptsHistory: QuizAttemptResult[];
  onSelectQuiz: (quiz: Quiz) => void;
}

export const TopicCatalog: React.FC<TopicCatalogProps> = ({
  quizzes,
  attemptsHistory,
  onSelectQuiz,
}) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedCertAttempt, setSelectedCertAttempt] = useState<QuizAttemptResult | null>(null);

  const handleStartExamAttempt = (quiz: Quiz) => {
    onSelectQuiz(quiz);
  };

  const myAttempts = attemptsHistory.filter(attempt => {
    if (!currentUser) return false;
    const matchEmail = currentUser.email && attempt.candidateEmail && attempt.candidateEmail.toLowerCase() === currentUser.email.toLowerCase();
    const matchName = currentUser.name && attempt.candidateName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    return matchEmail || matchName;
  });

  const topics = ['All', ...Array.from(new Set(quizzes.map(q => q.topic)))];
  const publishedQuizzes = quizzes.filter(q => {
    if (!q.isPublished) return false;
    // Whitelist check for private / institutional test sessions
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
      quiz.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'All' || quiz.topic === selectedTopic;
    const effectiveDifficulty = quiz.difficulty || 'Medium';
    const matchesDifficulty = selectedDifficulty === 'All' || effectiveDifficulty === selectedDifficulty;
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Dynamic Hero Promotional & Test Showcase Banner Slider */}
      <HeroBannerCarousel quizzes={publishedQuizzes} onSelectQuiz={handleStartExamAttempt} />

      {/* Institutional Examination Bulletin & Header Strip */}
      <div className="portal-card p-4 sm:p-7 bg-white border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>COMPUTER BASED TESTING (CBT) PORTAL</span>
            </div>

            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 font-sans break-words">
              Active Examination Papers & Test Series
            </h1>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">
              Official standardized testing system featuring automatic timer enforcement, negative marking rules, bilingual question rendering, and real-time merit rank computation.
            </p>
          </div>

          {/* Quick Metrics & Past Attempt Scorecards CTA */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-6 w-full lg:w-auto justify-between sm:justify-start">
            <div className="bg-slate-50 px-3 py-2 rounded border border-slate-200 text-center flex-1 sm:flex-initial min-w-[90px]">
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 uppercase block">Available Papers</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">{publishedQuizzes.length}</span>
            </div>

            <button
              onClick={() => {
                if (!currentUser) {
                  alert("Please sign in to view your examination scorecards.");
                  return;
                }
                setShowHistoryModal(true);
              }}
              className="px-3.5 py-2 sm:py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center space-x-2 transition-colors shadow-xs flex-1 sm:flex-initial cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>My Scorecards ({myAttempts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Structured Search & Filter Bar */}
      <div className="portal-card p-3 sm:p-4 bg-white border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by test paper title, subject code, or topic..."
              className="w-full pl-9 pr-3 py-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-medium flex items-center space-x-1 shrink-0">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Difficulty:</span>
            </span>
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded border border-slate-200 overflow-x-auto max-w-full">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${selectedDifficulty === diff
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Topic Filter Tags */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium mr-1.5 shrink-0">Subject:</span>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${selectedTopic === t
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Examination Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="portal-card p-12 text-center bg-white border border-slate-200 space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-900">No Examination Papers Match Selection</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or subject filter to view available assessments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz, index) => (
            <React.Fragment key={quiz.id}>
              {/* In-Between Exam Catalog Ad Banner (Centered between exam card rows) */}
              {index === 3 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 py-1">
                  <HeaderAdBanner
                    slotType="catalog_ad"
                    quizzes={quizzes}
                    onSelectQuiz={onSelectQuiz}
                    className="w-full transition-all duration-300"
                    containerClassName="w-full"
                  />
                </div>
              )}
              <div
                className="portal-card-interactive p-5 bg-white border border-slate-200 flex flex-col justify-between space-y-4"
              >
              <div className="space-y-3">
                {/* Header Strip: Subject Code & Difficulty */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200 truncate">
                    {quiz.topic}
                  </span>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${quiz.quizType === 'live_contest'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                      {quiz.quizType === 'live_contest' ? 'Timed Contest' : 'Standard CBT'}
                    </span>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${(quiz.difficulty || 'Medium') === 'Easy'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : (quiz.difficulty || 'Medium') === 'Hard'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                      {quiz.difficulty || 'Medium'}
                    </span>
                  </div>
                </div>

                {/* Paper Title & Description */}
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug line-clamp-2">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {quiz.description || 'Standard institutional practice test paper covering syllabus questions.'}
                  </p>
                </div>
              </div>

              {/* Assessment Parameter Strip & Action Button */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600">
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200/80">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>{quiz.questions.length} Questions</span>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200/80">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span>{quiz.timeLimitMinutes} Minutes</span>
                  </div>
                </div>

                {/* Examination Action Button State Logic */}
                {(() => {
                  const isContest = quiz.quizType === 'live_contest';
                  const hasAttempted = myAttempts.some(a => a.quizId === quiz.id);

                  if (isContest) {
                    const now = new Date();
                    const startDate = quiz.scheduledStartDateTime ? new Date(quiz.scheduledStartDateTime) : null;
                    const endDate = quiz.scheduledEndDateTime ? new Date(quiz.scheduledEndDateTime) : null;

                    if (hasAttempted) {
                      return (
                        <button
                          onClick={() => setShowHistoryModal(true)}
                          className="w-full py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Submitted (View Scorecard)</span>
                        </button>
                      );
                    }

                    if (startDate && now < startDate) {
                      return (
                        <div className="w-full py-2 rounded bg-amber-50 text-amber-900 font-semibold text-xs border border-amber-300 flex items-center justify-center space-x-1.5 text-center">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Starts: {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    }

                    if (endDate && now > endDate) {
                      return (
                        <div className="w-full py-2 rounded bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-300 flex items-center justify-center space-x-1.5 text-center">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Contest Window Closed</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={() => handleStartExamAttempt(quiz)}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Enter Live Contest Exam</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => handleStartExamAttempt(quiz)}
                      disabled={(() => {
                        if (!quiz.maxAttempts || quiz.maxAttempts === 0) return false;
                        const used = myAttempts.filter(a => a.quizId === quiz.id).length;
                        return used >= quiz.maxAttempts;
                      })()}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${currentUser
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                    >
                      {currentUser ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Start CBT Examination</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Sign In to Start Exam</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </React.Fragment>
        ))}
        </div>
      )}

      {/* Candidate Scorecard History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full p-6 rounded-lg border border-slate-200 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Official Candidate Scorecards</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 text-xs">
              {myAttempts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No examination scorecards found for {currentUser?.name || 'this candidate'}.
                </div>
              ) : (
                myAttempts.map((attempt) => (
                  <div key={attempt.id} className="p-3.5 rounded border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">{attempt.quizTitle}</h4>
                      <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                        {new Date(attempt.attemptedAt).toLocaleDateString()} • Candidate: {attempt.candidateName}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                        {attempt.percentage}% ({attempt.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'})
                      </span>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">Score: {attempt.score} / {attempt.maxScore}</p>

                      {attempt.passed && quizzes.find(q => q.id === attempt.quizId)?.enableCertificate !== false && (
                        <button
                          onClick={() => setSelectedCertAttempt(attempt)}
                          className="mt-1.5 text-[11px] text-indigo-900 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 px-2.5 py-1 rounded font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Award className="w-3 h-3 text-indigo-700" />
                          <span>Verifiable Certificate</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official QR-Verifiable Certificate Modal */}
      {selectedCertAttempt && (
        <CertificateModal
          result={selectedCertAttempt}
          onClose={() => setSelectedCertAttempt(null)}
        />
      )}
    </div>
  );
};
