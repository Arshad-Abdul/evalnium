import React, { useState, lazy, Suspense } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  Play,
  Eye,
  X,
  Activity,
  Search,
} from 'lucide-react';

const PDFCertificateModal = lazy(() => import('./PDFCertificateModal').then(m => ({ default: m.PDFCertificateModal })));
const ExamResultView = lazy(() => import('./ExamResultView').then(m => ({ default: m.ExamResultView })));

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
  const [historyLimit, setHistoryLimit] = useState<10 | 25 | 'all'>(10);
  const [attemptSearch, setAttemptSearch] = useState<string>('');
  const [attemptTopicFilter, setAttemptTopicFilter] = useState<string>('All');

  const myAttempts = attemptsHistory.filter(attempt => {
    if (!currentUser) return false;
    const matchEmail = currentUser.email && attempt.candidateEmail && attempt.candidateEmail.toLowerCase() === currentUser.email.toLowerCase();
    const matchName = currentUser.name && attempt.candidateName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    return matchEmail || matchName;
  });

  const chronologicalAttempts = [...myAttempts].sort(
    (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
  );
  const visibleChartAttempts =
    historyLimit === 'all' ? chronologicalAttempts : chronologicalAttempts.slice(-historyLimit);
  const chartStartNumber = chronologicalAttempts.length - visibleChartAttempts.length;

  const totalAttemptsCount = myAttempts.length;
  const passedAttempts = myAttempts.filter(a => a.passed);
  const totalPassedCount = passedAttempts.length;

  const totalScorePercentageSum = myAttempts.reduce((acc, curr) => acc + curr.percentage, 0);
  const averagePercentage = totalAttemptsCount > 0 ? Math.round((totalScorePercentageSum / totalAttemptsCount) * 10) / 10 : 0;

  const totalCorrectCount = myAttempts.reduce((acc, curr) => acc + (curr.correctAnswers || 0), 0);
  const totalAttemptedQuestionsCount = myAttempts.reduce((acc, curr) => acc + ((curr.correctAnswers || 0) + (curr.wrongAnswers || 0)), 0);
  const accuracyRate = totalAttemptedQuestionsCount > 0 ? Math.round((totalCorrectCount / totalAttemptedQuestionsCount) * 100) : 0;

  const platformScoreSum = attemptsHistory.reduce((acc, curr) => acc + curr.percentage, 0);
  const platformAvgPercentage = attemptsHistory.length > 0 ? Math.round((platformScoreSum / attemptsHistory.length) * 10) / 10 : 0;

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

  const topicStatsMap: Record<string, { totalPct: number; count: number }> = {};
  myAttempts.forEach(attempt => {
    const matchedQuiz = quizzes.find(q => q.id === attempt.quizId || q.title === attempt.quizTitle);
    const t = (matchedQuiz?.topic || attempt.topic || 'General').replace(/\s+/g, ' ').trim();
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
    <div className="space-y-5 sm:space-y-6">
      {/* Clean Workspace Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center shrink-0">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {currentUser?.name || 'Candidate'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
              {currentUser?.targetExam ? (
                <span>Target: <strong className="font-semibold text-slate-700">{currentUser.targetExam}</strong></span>
              ) : (
                <span>Performance overview & recent attempts</span>
              )}
              {currentStreak > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-amber-700">{currentStreak}-day streak</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToCatalog}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Browse Exams</span>
        </button>
      </div>

      {/* Unified 4-Cell Ledger Metric Strip */}
      <div className="portal-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Tests Completed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{totalAttemptsCount}</span>
            <span className="text-xs text-slate-400">attempts</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Average Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{averagePercentage}%</span>
            <span className="text-xs text-slate-400">overall</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Accuracy</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums">{accuracyRate}%</span>
            <span className="text-xs text-slate-400">correct</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Exams Passed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-blue-700 tabular-nums">{totalPassedCount}</span>
            <span className="text-xs text-slate-400">qualified</span>
          </div>
        </div>
      </div>

      {/* Benchmark Strip */}
      {totalAttemptsCount > 0 && (
        <div className="portal-card px-4 py-3 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <Activity className="w-4 h-4 text-blue-600 shrink-0" />
            <p>
              {averagePercentage >= platformAvgPercentage ? (
                <>
                  Your average is <strong className="font-semibold text-slate-900">{(averagePercentage - platformAvgPercentage).toFixed(1)}% above</strong> the platform average ({platformAvgPercentage}%).
                </>
              ) : (
                <>
                  Your average is <strong className="font-semibold text-slate-900">{(platformAvgPercentage - averagePercentage).toFixed(1)}% below</strong> the platform average ({platformAvgPercentage}%).
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 tabular-nums pl-6 sm:pl-0">
            <span>You: <strong className="text-slate-800">{averagePercentage}%</strong></span>
            <span>·</span>
            <span>Avg: <strong className="text-slate-800">{platformAvgPercentage}%</strong></span>
          </div>
        </div>
      )}

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2-Cols: Score Trend */}
        <div className="lg:col-span-2 portal-card p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Score History</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {chronologicalAttempts.length === 0
                  ? 'Completed test progression'
                  : historyLimit === 'all'
                    ? `All ${chronologicalAttempts.length} completed tests (oldest → latest)`
                    : `Last ${visibleChartAttempts.length} of ${chronologicalAttempts.length} completed tests (oldest → latest)`}
              </p>
            </div>

            {chronologicalAttempts.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70" role="group" aria-label="Score history range">
                {([
                  { value: 10, label: 'Last 10' },
                  { value: 25, label: 'Last 25' },
                  { value: 'all', label: `All (${chronologicalAttempts.length})` },
                ] as const).map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => setHistoryLimit(option.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      historyLimit === option.value
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {myAttempts.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
              No attempts recorded yet. Take a test to track your progress here.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative h-52 w-full border border-slate-200 bg-slate-50/70 rounded-lg overflow-hidden">
                <div className="absolute inset-x-3 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-45 z-0">
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

                <div className="h-full w-full overflow-x-auto">
                  <div className="h-full min-w-full w-max flex items-end justify-between gap-2 pt-6 pb-2 px-3">
                    {visibleChartAttempts.map((attempt, idx) => {
                      const pct = Math.round(attempt.percentage);
                      const barHeight = Math.min(100, Math.max(8, pct));
                      const attemptNumber = chartStartNumber + idx + 1;
                      const shortDate = new Date(attempt.attemptedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });

                      return (
                        <div key={attempt.id || idx} className="h-full flex-1 min-w-[44px] flex flex-col items-center justify-end group relative z-10">
                          <div className="absolute top-0 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow">
                            <span>{attempt.quizTitle} ({shortDate}): <strong>{pct}%</strong></span>
                          </div>

                          <span className="text-[10px] font-mono font-semibold mb-1 text-slate-700 tabular-nums">
                            {pct}%
                          </span>

                          <div className="w-full max-w-[30px] h-32 bg-slate-200/80 rounded-sm relative flex items-end overflow-hidden">
                            <div
                              className={`w-full rounded-sm transition-all duration-500 ${
                                attempt.passed ? 'bg-emerald-600' : 'bg-rose-500'
                              }`}
                              style={{ height: `${barHeight}%` }}
                            />
                          </div>

                          <span className="text-[10px] font-mono text-slate-500 mt-1">
                            #{attemptNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Recent Attempts</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-emerald-600" />
                    <span>Passed (≥60%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-rose-500" />
                    <span>Needs Work</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Subject Breakdown */}
        <div className="portal-card p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Subject Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Average accuracy by topic</p>
          </div>

          <div className="space-y-3">
            {topicMasteryList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Complete tests across subjects to view topic performance.
              </p>
            ) : (
              topicMasteryList.map(item => (
                <div key={item.topicName} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[160px]">{item.topicName}</span>
                    <span className={`font-mono font-semibold text-[11px] ${
                      item.isWeak ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      {item.avgPercentage}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.isWeak ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${item.avgPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.attemptCount} {item.attemptCount === 1 ? 'attempt' : 'attempts'}</span>
                    <span>{item.isWeak ? 'Review recommended' : 'On track'}</span>
                  </div>
                </div>
              ))
            )}

            {quizzes.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Quick Practice
                </span>
                <div className="space-y-1.5">
                  {quizzes.slice(0, 3).map(quiz => (
                    <button
                      key={quiz.id}
                      type="button"
                      onClick={() => onSelectQuiz(quiz)}
                      className="w-full p-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{quiz.title}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{quiz.questions.length} Qs · {quiz.timeLimitMinutes}m</p>
                      </div>
                      <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Past Attempts Archive */}
      <div className="portal-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Attempt History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">All recorded scorecards for {currentUser?.name} (newest first)</p>
          </div>

          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>All Papers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {(() => {
          const resolveAttemptTopic = (attempt: QuizAttemptResult) => {
            const matchedQuiz = quizzes.find(q => q.id === attempt.quizId || q.title === attempt.quizTitle);
            return (matchedQuiz?.topic || attempt.topic || 'General').replace(/\s+/g, ' ').trim();
          };
          const attemptTopics = ['All', ...Array.from(new Set(myAttempts.map(resolveAttemptTopic)))];
          const newestFirstAttempts = [...myAttempts]
            .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime())
            .filter(attempt => {
              const resolvedTopic = resolveAttemptTopic(attempt);
              const matchesTopic = attemptTopicFilter === 'All' || resolvedTopic === attemptTopicFilter;
              const qLower = attemptSearch.trim().toLowerCase();
              const matchesSearch = !qLower || attempt.quizTitle.toLowerCase().includes(qLower) || resolvedTopic.toLowerCase().includes(qLower);
              return matchesTopic && matchesSearch;
            });

          return (
            <>
              {myAttempts.length > 3 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={attemptSearch}
                      onChange={(e) => setAttemptSearch(e.target.value)}
                      placeholder="Filter scorecards by paper..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  {attemptTopics.length > 2 && (
                    <select
                      value={attemptTopicFilter}
                      onChange={(e) => setAttemptTopicFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      {attemptTopics.map(t => (
                        <option key={t} value={t}>{t === 'All' ? 'All Subjects' : t}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {myAttempts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No attempts logged yet. Start a test from the catalog to see your results here.
                  </div>
                ) : newestFirstAttempts.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No attempts match your filter.
                  </div>
                ) : (
                  newestFirstAttempts.map(attempt => {
                    const resolvedTopic = resolveAttemptTopic(attempt);
                    return (
                      <div
                        key={attempt.id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                              {resolvedTopic}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{attempt.quizTitle}</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(attempt.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                          <div className="sm:text-right">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                                attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {attempt.percentage}% ({attempt.passed ? 'Passed' : 'Below Pass'})
                            </span>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                              Score: {attempt.score} / {attempt.maxScore}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {attempt.passed && quizzes.find(q => q.id === attempt.quizId)?.enableCertificate !== false && (
                              <button
                                type="button"
                                onClick={() => setSelectedCertAttempt(attempt)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
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
                                    type="button"
                                    onClick={() => setReviewAttempt(attempt)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Review</span>
                                  </button>
                                );
                              }
                              return (
                                <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-mono">
                                  Results: {announcementDate!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* PDF Certificate Download Modal */}
      {selectedCertAttempt && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Full Attempt Review Overlay */}
      {reviewAttempt && (() => {
        const reviewQuiz = quizzes.find(q => q.id === reviewAttempt.quizId);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 z-10">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">Attempt Review</h2>
                  <p className="text-xs text-slate-500 font-mono">
                    {reviewAttempt.quizTitle} · {new Date(reviewAttempt.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewAttempt(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close review"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {reviewQuiz ? (
                <Suspense fallback={
                  <div className="portal-card p-10 text-center text-xs font-mono text-slate-500">
                    Loading detailed answer review...
                  </div>
                }>
                  <ExamResultView
                    result={reviewAttempt}
                    quiz={reviewQuiz}
                    onRetake={() => { setReviewAttempt(null); onSelectQuiz(reviewQuiz); }}
                    onGoHome={() => setReviewAttempt(null)}
                  />
                </Suspense>
              ) : (
                <div className="portal-card p-12 text-center space-y-2">
                  <p className="font-bold text-slate-800">Exam Paper Not Found</p>
                  <p className="text-xs text-slate-500">The examination paper for this attempt is no longer active.</p>
                  <button
                    type="button"
                    onClick={() => setReviewAttempt(null)}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
