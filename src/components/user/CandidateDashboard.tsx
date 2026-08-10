import React, { useState } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { useAuth } from '../../context/AuthContext';
import { Award, Trophy, Target, TrendingUp, BookOpen, Clock, CheckCircle2, AlertTriangle, ArrowRight, Play } from 'lucide-react';
import { PDFCertificateModal } from './PDFCertificateModal';

interface CandidateDashboardProps {
  quizzes: Quiz[];
  attemptsHistory: QuizAttemptResult[];
  onSelectQuiz: (quiz: Quiz) => void;
  onNavigateToCatalog: () => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  quizzes,
  attemptsHistory,
  onSelectQuiz,
  onNavigateToCatalog,
}) => {
  const { currentUser } = useAuth();
  const [selectedCertAttempt, setSelectedCertAttempt] = useState<QuizAttemptResult | null>(null);

  // Filter attempts belonging to the current candidate
  const myAttempts = attemptsHistory.filter(attempt => {
    if (!currentUser) return false;
    const matchEmail = currentUser.email && attempt.candidateEmail && attempt.candidateEmail.toLowerCase() === currentUser.email.toLowerCase();
    const matchName = currentUser.name && attempt.candidateName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    return matchEmail || matchName;
  });

  const totalAttemptsCount = myAttempts.length;
  const passedAttempts = myAttempts.filter(a => a.passed);
  const totalPassedCount = passedAttempts.length;

  const totalScorePercentageSum = myAttempts.reduce((acc, curr) => acc + curr.percentage, 0);
  const averagePercentage = totalAttemptsCount > 0 ? Math.round((totalScorePercentageSum / totalAttemptsCount) * 10) / 10 : 0;

  const totalCorrectCount = myAttempts.reduce((acc, curr) => acc + (curr.correctAnswers || 0), 0);
  const totalAttemptedQuestionsCount = myAttempts.reduce((acc, curr) => acc + ((curr.correctAnswers || 0) + (curr.wrongAnswers || 0)), 0);
  const accuracyRate = totalAttemptedQuestionsCount > 0 ? Math.round((totalCorrectCount / totalAttemptedQuestionsCount) * 100) : 0;

  // Topic Mastery Breakdown Calculation
  const topicStatsMap: Record<string, { totalPct: number; count: number }> = {};
  myAttempts.forEach(attempt => {
    const t = attempt.topic || 'General';
    if (!topicStatsMap[t]) {
      topicStatsMap[t] = { totalPct: 0, count: 0 };
    }
    topicStatsMap[t].totalPct += attempt.percentage;
    topicStatsMap[t].count += 1;
  });

  const topicMasteryList = Object.entries(topicStatsMap).map(([topicName, data]) => {
    const avg = Math.round(data.totalPct / data.count);
    return {
      topicName,
      avgPercentage: avg,
      attemptCount: data.count,
      isWeak: avg < 60,
    };
  }).sort((a, b) => a.avgPercentage - b.avgPercentage);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Candidate Welcome Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-widest font-mono">
                  VERIFIED STUDENT PROFILE
                </span>
                {currentUser?.targetExam && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    Target: {currentUser.targetExam}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
                Welcome Back, {currentUser?.name || 'Candidate'}! 👋
              </h1>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Track your National Rank performance, review topic mastery, and download merit certificates.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToCatalog}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch CBT Exam Catalog</span>
          </button>
        </div>
      </div>

      {/* 4 Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Tests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tests Completed</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 font-mono">{totalAttemptsCount}</span>
            <span className="text-xs text-slate-500 font-semibold">Exams Taken</span>
          </div>
        </div>

        {/* Card 2: Average Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Average Score %</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-indigo-600 font-mono">{averagePercentage}%</span>
            <span className="text-xs text-slate-500 font-semibold">Overall Avg</span>
          </div>
        </div>

        {/* Card 3: Accuracy Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Accuracy Rate</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-600 font-mono">{accuracyRate}%</span>
            <span className="text-xs text-slate-500 font-semibold">Correct Ratio</span>
          </div>
        </div>

        {/* Card 4: Passed Exams */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Passed Exams</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600 font-mono">{totalPassedCount}</span>
            <span className="text-xs text-slate-500 font-semibold">Distinctions</span>
          </div>
        </div>

      </div>

      {/* Main Dashboard Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2-Cols: Interactive Score Trajectory Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <span>Candidate Performance Trajectory Chart</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Historical Score Percentage (%) across recent test attempts</p>
            </div>
          </div>

          {/* SVG Score Line Chart */}
          {myAttempts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-2xl">
              No test attempts logged yet. Complete a CBT exam to view your visual score chart!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-48 w-full flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200">
                {myAttempts.slice(-10).map((attempt, idx) => {
                  const heightPct = Math.max(10, attempt.percentage);
                  return (
                    <div key={attempt.id || idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {attempt.quizTitle}: {attempt.percentage}%
                      </div>

                      {/* Score Value Bar */}
                      <div
                        className={`w-full max-w-[36px] rounded-t-xl transition-all ${
                          attempt.passed ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-rose-600 to-rose-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />

                      <span className="text-[10px] font-mono font-bold text-slate-600">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Attempt Sequence (Recent 10)</span>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Passed (≥60%)</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Needs Improvement</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Topic Weak Area Radar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Target className="w-5 h-5 text-amber-500" />
              <span>Topic Weak Area Radar</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Identify subjects needing revision</p>
          </div>

          <div className="space-y-4">
            {topicMasteryList.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-6">
                Take tests across different topics to generate your Subject Weak Area breakdown!
              </p>
            ) : (
              topicMasteryList.map(item => (
                <div key={item.topicName} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{item.topicName}</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      item.isWeak ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {item.avgPercentage}% Avg
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.isWeak ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${item.avgPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>{item.attemptCount} Attempt{item.attemptCount > 1 ? 's' : ''}</span>
                    <span className="flex items-center space-x-1">
                      {item.isWeak ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span className="text-rose-600 font-bold">Needs Revision</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-700 font-bold">Strong Mastery</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Quick Recommended Exam Cards */}
            {quizzes.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Recommended Exams</p>
                <div className="space-y-2">
                  {quizzes.slice(0, 3).map(quiz => (
                    <button
                      key={quiz.id}
                      onClick={() => onSelectQuiz(quiz)}
                      className="w-full p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 text-left transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">{quiz.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{quiz.questions.length} MCQs • {quiz.timeLimitMinutes} Mins</p>
                      </div>
                      <Play className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Attempts Scorecards Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Recent Examination Scorecards & PDF Certificates</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Verified attempt scorecards for candidate {currentUser?.name}</p>
          </div>

          <button
            onClick={onNavigateToCatalog}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View All Exams</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {myAttempts.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-medium text-xs">
              No examination scorecards logged yet. Click "Launch CBT Exam Catalog" above to start your first test!
            </div>
          ) : (
            myAttempts.map(attempt => (
              <div key={attempt.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {attempt.topic || 'General'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{attempt.quizTitle}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(attempt.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold text-xs ${
                      attempt.passed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {attempt.percentage}% ({attempt.passed ? 'PASSED' : 'FAILED'})
                    </span>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">Score: {attempt.score} / {attempt.maxScore}</p>
                  </div>

                  {attempt.passed && quizzes.find(q => q.id === attempt.quizId)?.enableCertificate !== false && (
                    <button
                      onClick={() => setSelectedCertAttempt(attempt)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>PDF Merit Certificate 📜</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
