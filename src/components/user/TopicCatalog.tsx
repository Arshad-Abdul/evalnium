import React, { useState } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { Search, BookOpen, Clock, Play, History, Filter, X, Lock, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PDFCertificateModal } from './PDFCertificateModal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
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
    // Target Emails Whitelist check
    if (q.allowedEmails && q.allowedEmails.length > 0) {
      if (!currentUser || !currentUser.email) return false;
      const lowerEmails = q.allowedEmails.map(e => e.toLowerCase());
      if (!lowerEmails.includes(currentUser.email.toLowerCase())) {
        return false; // Hide if user is not in whitelist
      }
    }
    return true;
  });

  const filteredQuizzes = publishedQuizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'All' || quiz.topic === selectedTopic;
    const matchesDifficulty = selectedDifficulty === 'All' || quiz.difficulty === selectedDifficulty;
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-slate-900 text-white p-8 sm:p-10 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-semibold">
            <span>OFFICIAL EXAMINATION PORTAL</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Computer-Based Testing (CBT) Series & Practice Exams
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium">
            Standardized assessment platform with real-time countdown timer, automated evaluation, negative marking rules, and instant detailed explanations.
          </p>

          <div className="flex items-center space-x-4 pt-2">
            <button
              onClick={() => {
                if (!currentUser) {
                  alert("Please sign in to view your history.");
                  return;
                }
                setShowHistoryModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-semibold flex items-center space-x-2 transition-all"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>My Test Attempts ({myAttempts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or topic..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Difficulty:</span>
            </span>
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    selectedDifficulty === diff
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Topic Pills Row */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-2 flex-shrink-0">Topics:</span>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTopic === t
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center border border-slate-200 shadow-xs space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-900">No Tests Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            No exams match your filter criteria. Log into Admin Studio to upload new quiz files.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="eval-card-interactive p-6 rounded-xl flex flex-col justify-between space-y-5 bg-white border border-slate-200"
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {/* Row 1: Topic */}
                  <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200 max-w-full truncate">
                    {quiz.topic}
                  </span>
                  {/* Row 2: Quiz Type + Difficulty */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      quiz.quizType === 'live_contest'
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      {quiz.quizType === 'live_contest' ? '🏆 Live Contest' : '🌐 24/7 Practice'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      (quiz.difficulty || 'Medium') === 'Easy'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : (quiz.difficulty || 'Medium') === 'Hard'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {quiz.difficulty || 'Medium'}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2">
                  {quiz.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                  {quiz.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600">
                  <div className="flex items-center space-x-1.5 bg-slate-50 p-2 rounded border border-slate-200/80">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>{quiz.questions.length} Questions</span>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-50 p-2 rounded border border-slate-200/80">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{quiz.timeLimitMinutes} Mins</span>
                  </div>
                </div>

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
                          className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center justify-center space-x-2 transition-colors"
                        >
                          <History className="w-3.5 h-3.5 text-amber-600" />
                          <span>🔒 1-Time Locked (View Scorecard)</span>
                        </button>
                      );
                    }

                    if (startDate && now < startDate) {
                      return (
                        <div className="w-full py-2.5 rounded-lg bg-amber-50 text-amber-900 font-bold text-xs border border-amber-300 flex items-center justify-center space-x-1.5 text-center">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>⏳ Contest Starts: {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    }

                    if (endDate && now > endDate) {
                      return (
                        <div className="w-full py-2.5 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs border border-slate-300 flex items-center justify-center space-x-1.5 text-center">
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span>🔒 Contest Window Closed</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={() => handleStartExamAttempt(quiz)}
                        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all animate-pulse"
                      >
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        <span>🟢 LIVE CONTEST NOW! (Attempt Test)</span>
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
                      className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        currentUser
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
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
          ))}
        </div>
      )}


      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Your Test Attempt Scorecards</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {myAttempts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-medium">
                  No exam scorecards logged for {currentUser?.name || 'your account'} yet. Take a CBT test to track your performance history!
                </div>
              ) : (
                myAttempts.map((attempt) => (
                  <div key={attempt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{attempt.quizTitle}</h4>
                      <p className="text-slate-500 text-[11px] font-medium">
                        {new Date(attempt.attemptedAt).toLocaleDateString()} • Candidate: {attempt.candidateName}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                        attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {attempt.percentage}% ({attempt.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'})
                      </span>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">Score: {attempt.score}/{attempt.maxScore}</p>
                      
                      {attempt.passed && quizzes.find(q => q.id === attempt.quizId)?.enableCertificate !== false && (
                        <button
                          onClick={() => setSelectedCertAttempt(attempt)}
                          className="mt-2 text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition-all shadow-xs"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>PDF Merit Certificate 📜</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Certificate Download Modal */}
      {selectedCertAttempt && (
        <PDFCertificateModal
          isOpen={Boolean(selectedCertAttempt)}
          onClose={() => setSelectedCertAttempt(null)}
          candidateName={selectedCertAttempt.candidateName}
          quizTitle={selectedCertAttempt.quizTitle}
          topic={selectedCertAttempt.topic || 'Assessment'}
          score={selectedCertAttempt.score}
          maxScore={selectedCertAttempt.maxScore}
          percentage={selectedCertAttempt.percentage}
          date={selectedCertAttempt.attemptedAt}
          attemptId={selectedCertAttempt.id}
        />
      )}
    </div>
  );
};
