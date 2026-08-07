import React, { useState } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { Search, BookOpen, Clock, Play, History, Filter, Sparkles, ShieldCheck } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const topics = ['All', ...Array.from(new Set(quizzes.map(q => q.topic)))];
  const publishedQuizzes = quizzes.filter(q => q.isPublished);

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
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 rounded-3xl text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Evalnium — Global CBT Examination System</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Evalnium Topic-Wise Online MCQ Examination Portal
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Select an exam topic to test your knowledge with real-time countdown timer, automated grading, instant scorecards, and detailed answer key explanations.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-3">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center space-x-2 transition-all shadow-md backdrop-blur-md"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>View Past Scorecards ({attemptsHistory.length})</span>
            </button>

            <button
              onClick={() => {
                const adminBtn = document.querySelector('header button:nth-child(2)') as HTMLButtonElement;
                if (adminBtn) adminBtn.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/30"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Studio (Upload Quiz)</span>
            </button>
          </div>
        </div>

        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search topic or exam title..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Difficulty:</span>
            </span>
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedDifficulty === diff
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedTopic === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-xs space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900">No Exams Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or filters, or log in to the Evalnium Admin Studio to upload new quiz files.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-5 group relative bg-white border border-slate-200 hover:border-indigo-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {quiz.topic}
                  </span>

                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    quiz.difficulty === 'Easy'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : quiz.difficulty === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {quiz.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                  {quiz.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                  {quiz.description}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <span className="block font-mono font-bold text-slate-900 text-sm">{quiz.questions.length}</span>
                    <span className="text-[10px] text-slate-500 font-medium">MCQs</span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <span className="block font-mono font-bold text-amber-700 text-sm flex items-center justify-center">
                      <Clock className="w-3 h-3 mr-1 text-amber-600" />
                      <span>{quiz.timeLimitMinutes}m</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Duration</span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <span className="block font-mono font-bold text-emerald-700 text-sm">{quiz.passingPercentage}%</span>
                    <span className="text-[10px] text-slate-500 font-medium">Pass Mark</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectQuiz(quiz)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Exam Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full p-6 rounded-3xl border border-slate-200 space-y-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <History className="w-5 h-5 text-emerald-600" />
                <span>Evalnium Candidate Scorecards</span>
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {attemptsHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No exam attempts recorded yet. Take an exam above!
                </div>
              ) : (
                attemptsHistory.map((att) => (
                  <div
                    key={att.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{att.quizTitle}</h4>
                      <p className="text-xs text-slate-500">
                        Topic: {att.topic} • {new Date(att.attemptedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-mono font-black text-base text-slate-900">
                          {att.score} / {att.totalQuestions}
                        </div>
                        <div className="text-xs font-bold text-slate-500">
                          {att.percentage.toFixed(0)}%
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        att.passed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {att.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
