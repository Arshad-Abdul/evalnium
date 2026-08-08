import React, { useState } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { Search, BookOpen, Clock, Play, History, Filter, X } from 'lucide-react';

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
              onClick={() => setShowHistoryModal(true)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-semibold flex items-center space-x-2 transition-all"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>My Test Attempts ({attemptsHistory.length})</span>
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
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                    {quiz.topic}
                  </span>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    quiz.difficulty === 'Easy'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : quiz.difficulty === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {quiz.difficulty}
                  </span>
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

                <button
                  onClick={() => onSelectQuiz(quiz)}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start CBT Examination</span>
                </button>
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
              {attemptsHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-medium">
                  No exam scorecards logged yet. Take a CBT test to track your performance history!
                </div>
              ) : (
                attemptsHistory.map((attempt) => (
                  <div key={attempt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{attempt.quizTitle}</h4>
                      <p className="text-slate-500 text-[11px] font-medium">
                        {new Date(attempt.attemptedAt).toLocaleDateString()} • Candidate: {attempt.candidateName}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                        attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {attempt.percentage}% ({attempt.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'})
                      </span>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">Score: {attempt.score}/{attempt.maxScore}</p>
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
    </div>
  );
};
