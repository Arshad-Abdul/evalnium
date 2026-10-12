import React, { useState } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { useAuth } from '../../context/AuthContext';
import { Award, Trophy, Target, TrendingUp, BookOpen, Clock, CheckCircle2, AlertTriangle, ArrowRight, Play, Eye, X, Activity } from 'lucide-react';
import { PDFCertificateModal } from './PDFCertificateModal';
import { ExamResultView } from './ExamResultView';

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
  const [reviewAttempt, setReviewAttempt] = useState<QuizAttemptResult | null>(null);

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

  // Platform Average score calculation
  const platformScoreSum = attemptsHistory.reduce((acc, curr) => acc + curr.percentage, 0);
  const platformAvgPercentage = attemptsHistory.length > 0 ? Math.round((platformScoreSum / attemptsHistory.length) * 10) / 10 : 0;

  // Streak calculation: consecutive days with at least 1 test attempt
  const calculateStreak = (attempts: QuizAttemptResult[]) => {
    if (attempts.length === 0) return 0;

    const sorted = [...attempts].sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
    const dates = Array.from(new Set(sorted.map(a => new Date(a.attemptedAt).toLocaleDateString('en-CA'))));
    if (dates.length === 0) return 0;

    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 0;
    let currentDate = new Date(dates[0]);

    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]);
      const diffTime = Math.abs(currentDate.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        currentDate = d;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak(myAttempts);

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
    <div className="space-y-6">

      {/* Institutional Candidate Credentials Banner */}
      <div className="portal-card p-6 sm:p-7 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded bg-slate-900 text-white font-bold text-xl flex items-center justify-center border border-slate-700 shadow-sm flex-shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-semibold uppercase">
                  Authenticated Candidate
                </span>
                {currentUser?.targetExam && (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-semibold">
                    Target: {currentUser.targetExam}
                  </span>
                )}
                {currentStreak > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-mono font-semibold">
                    {currentStreak} Day Practice Streak
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Candidate Assessment Studio: {currentUser?.name || 'Candidate'}
              </h1>
              <p className="text-xs text-slate-500 font-normal">
                Comprehensive performance analytics, topic diagnostic mastery, and practice scorecards.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToCatalog}
            className="px-4 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center space-x-2 transition-colors cursor-pointer flex-shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Launch CBT Exam Catalog</span>
          </button>
        </div>
      </div>

      {/* 4 Performance KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

        {/* Tile 1: Total Tests */}
        <div className="portal-card p-4 bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase text-slate-500 font-medium">Tests Completed</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">{totalAttemptsCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">Papers Logged</span>
          </div>
        </div>

        {/* Tile 2: Average Score */}
        <div className="portal-card p-4 bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase text-slate-500 font-medium">Average Score</span>
            <TrendingUp className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">{averagePercentage}%</span>
            <span className="text-[11px] text-slate-500 font-mono">Mean Percentage</span>
          </div>
        </div>

        {/* Tile 3: Accuracy Rate */}
        <div className="portal-card p-4 bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase text-slate-500 font-medium">Accuracy Ratio</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono">{accuracyRate}%</span>
            <span className="text-[11px] text-slate-500 font-mono">Correct Answers</span>
          </div>
        </div>

        {/* Tile 4: Qualified Exams */}
        <div className="portal-card p-4 bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase text-slate-500 font-medium">Qualified Exams</span>
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700 font-mono">{totalPassedCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">Pass Criteria Met</span>
          </div>
        </div>

      </div>

      {/* Benchmark Summary Strip */}
      {totalAttemptsCount > 0 && (
        <div className="portal-card p-4 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-xs text-slate-700 font-normal">
              {averagePercentage >= platformAvgPercentage ? (
                <>
                  Your average score is <span className="font-semibold text-slate-900 font-mono">{(averagePercentage - platformAvgPercentage).toFixed(1)}% above</span> the platform cohort benchmark ({platformAvgPercentage}%).
                </>
              ) : (
                <>
                  Your average score is <span className="font-semibold text-slate-900 font-mono">{(platformAvgPercentage - averagePercentage).toFixed(1)}% below</span> the platform cohort benchmark ({platformAvgPercentage}%).
                </>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3 font-mono text-xs text-slate-600">
            <span>Candidate: <strong>{averagePercentage}%</strong></span>
            <span>•</span>
            <span>Platform: <strong>{platformAvgPercentage}%</strong></span>
          </div>
        </div>
      )}

      {/* Main Grid: Trajectory Chart & Topic Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2-Cols: Score Trajectory Chart */}
        <div className="lg:col-span-2 portal-card p-5 sm:p-6 bg-white border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Score Trajectory & Performance Trend</span>
              </h3>
              <p className="text-xs text-slate-500">Historical performance across last 10 test attempts</p>
            </div>
          </div>

          {/* Performance Trajectory Chart */}
          {myAttempts.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded">
              No examination attempts logged yet. Take a CBT test to view your performance curve.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Chart Grid with Y-Axis and Bars */}
              <div className="relative h-52 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-3 border border-slate-200 bg-slate-50 rounded">
                {/* Horizontal Reference Lines */}
                <div className="absolute inset-x-3 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-slate-300 w-full flex justify-end">
                    <span className="text-[9px] font-mono text-slate-500 -mt-2 mr-1">100%</span>
                  </div>
                  <div className="border-b border-dashed border-slate-300 w-full flex justify-end">
                    <span className="text-[9px] font-mono text-slate-500 -mt-2 mr-1">60% Pass</span>
                  </div>
                  <div className="border-b border-dashed border-slate-300 w-full flex justify-end">
                    <span className="text-[9px] font-mono text-slate-500 -mt-2 mr-1">0%</span>
                  </div>
                </div>

                {myAttempts.slice(-10).map((attempt, idx) => {
                  const pct = Math.round(attempt.percentage);
                  const barHeight = Math.min(100, Math.max(8, pct));
                  return (
                    <div key={attempt.id || idx} className="h-full flex-1 flex flex-col items-center justify-end group relative z-10">

                      {/* Hover Tooltip */}
                      <div className="absolute -top-7 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow border border-slate-700">
                        <span>{attempt.quizTitle}: <strong>{pct}%</strong></span>
                      </div>

                      {/* Percentage Top Value */}
                      <span className="text-[10px] font-mono font-semibold mb-1 text-slate-700 tabular-nums">
                        {pct}%
                      </span>

                      {/* Bar Container */}
                      <div className="w-full max-w-[32px] h-32 bg-slate-200 rounded-sm relative flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-sm transition-all duration-500 ${attempt.passed ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>

                      {/* Attempt Index */}
                      <span className="text-[10px] font-mono text-slate-500 mt-1">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Recent 10 Attempts</span>
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-xs bg-emerald-600" />
                    <span>Qualified (≥60%)</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-xs bg-rose-600" />
                    <span>Needs Improvement</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Syllabus Topic Diagnostic */}
        <div className="portal-card p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Target className="w-4 h-4 text-slate-700" />
              <span>Syllabus Topic Diagnostic</span>
            </h3>
            <p className="text-xs text-slate-500">Subject mastery and revision priorities</p>
          </div>

          <div className="space-y-3">
            {topicMasteryList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Complete tests across different subjects to generate topic diagnostic curves.
              </p>
            ) : (
              topicMasteryList.map(item => (
                <div key={item.topicName} className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900 truncate max-w-[150px]">{item.topicName}</span>
                    <span className={`font-mono font-semibold px-1.5 py-0.2 rounded text-[11px] ${item.isWeak ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                      {item.avgPercentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.isWeak ? 'bg-rose-500' : 'bg-emerald-600'
                        }`}
                      style={{ width: `${item.avgPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{item.attemptCount} Attempt{item.attemptCount > 1 ? 's' : ''}</span>
                    <span>{item.isWeak ? 'Needs Revision' : 'Mastery Confirmed'}</span>
                  </div>
                </div>
              ))
            )}

            {/* Recommended Examination Papers */}
            {quizzes.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Recommended Practice Papers</span>
                <div className="space-y-1.5">
                  {quizzes.slice(0, 3).map(quiz => (
                    <button
                      key={quiz.id}
                      onClick={() => onSelectQuiz(quiz)}
                      className="w-full p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">{quiz.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{quiz.questions.length} MCQs • {quiz.timeLimitMinutes} Mins</p>
                      </div>
                      <Play className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Scorecards Table */}
      <div className="portal-card p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Candidate Scorecard Archive</span>
            </h3>
            <p className="text-xs text-slate-500">Verified attempt records for candidate {currentUser?.name}</p>
          </div>

          <button
            onClick={onNavigateToCatalog}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>View All Papers</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {myAttempts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No examination scorecards logged yet. Launch a test paper to view verified records.
            </div>
          ) : (
            myAttempts.map(attempt => (
              <div key={attempt.id} className="p-3.5 rounded border border-slate-200 bg-slate-50 hover:bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      {attempt.topic || 'General'}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{attempt.quizTitle}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(attempt.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                      {attempt.percentage}% ({attempt.passed ? 'PASSED' : 'NEEDS REVISION'})
                    </span>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">Score: {attempt.score} / {attempt.maxScore}</p>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {attempt.passed && quizzes.find(q => q.id === attempt.quizId)?.enableCertificate !== false && (
                      <button
                        onClick={() => setSelectedCertAttempt(attempt)}
                        className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-semibold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-700" />
                        <span>Certificate</span>
                      </button>
                    )}

                    {(() => {
                      const q = quizzes.find(q => q.id === attempt.quizId);
                      const announcementDate = q?.resultAnnouncementDateTime ? new Date(q.resultAnnouncementDateTime) : null;
                      const reviewAvailable = !announcementDate || new Date() >= announcementDate;
                      if (reviewAvailable) {
                        return (
                          <button
                            onClick={() => setReviewAttempt(attempt)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit Review</span>
                          </button>
                        );
                      }
                      return (
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs font-mono">
                          Results: {announcementDate!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      );
                    })()}
                  </div>
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

      {/* Full Attempt Review Overlay */}
      {reviewAttempt && (() => {
        const reviewQuiz = quizzes.find(q => q.id === reviewAttempt.quizId);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-4 z-10">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">Attempt Session Audit Review</h2>
                  <p className="text-xs text-slate-500 font-mono">{reviewAttempt.quizTitle} • {new Date(reviewAttempt.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <button onClick={() => setReviewAttempt(null)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {reviewQuiz ? (
                <ExamResultView
                  result={reviewAttempt}
                  quiz={reviewQuiz}
                  onRetake={() => { setReviewAttempt(null); onSelectQuiz(reviewQuiz); }}
                  onGoHome={() => setReviewAttempt(null)}
                />
              ) : (
                <div className="portal-card p-12 text-center bg-white border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800">Exam Paper Not Found</p>
                  <p className="text-xs text-slate-500">The examination paper for this attempt is no longer active.</p>
                  <button onClick={() => setReviewAttempt(null)} className="mt-3 px-4 py-1.5 rounded bg-slate-900 text-white font-semibold text-xs">Close</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};
