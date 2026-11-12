import React, { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../../types/auth';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { getStoredResults, getStoredQuizzes } from '../../utils/storage';
import { exportLeaderboardToCSV } from '../../utils/export';
import { 
  Trophy, Award, Medal, Search, Filter, Clock, Download, 
  Lock, LogIn, BookOpen, ShieldCheck, HelpCircle, CheckCircle2, ChevronRight,
  Calculator, Gauge, Activity, Percent
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { SubjectFilterBar } from '../common/SubjectFilterBar';

interface LeaderboardViewProps {
  quizzes?: Quiz[];
  attemptsHistory?: QuizAttemptResult[];
  onNavigateToCatalog?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  quizzes: liveQuizzes,
  attemptsHistory: liveResults,
  onNavigateToCatalog,
}) => {
  const { currentUser, isAdminAuthenticated } = useAuth();
  const isSuperAdmin = isAdminAuthenticated && (!currentUser || currentUser?.role === 'admin');
  const isAuthenticated = Boolean(currentUser) || isAdminAuthenticated;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState('All Exams (Overall Cumulative)');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const normalizeTopic = (value?: string) => (value || '').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    const activeQuizzes = liveQuizzes && liveQuizzes.length > 0 ? liveQuizzes : getStoredQuizzes();
    const results = liveResults && liveResults.length > 0 ? liveResults : getStoredResults();
    
    // Filter out deleted quizzes (Live/Published and Drafted quizzes remain!)
    const validResults = results.filter(r => {
      if (!r.quizId && !r.quizTitle) return false;
      return activeQuizzes.some(q => q.id === r.quizId || q.title === r.quizTitle);
    });

    const formatted: LeaderboardEntry[] = validResults.map((r) => {
      const matchedQuiz = activeQuizzes.find(q => q.id === r.quizId || q.title === r.quizTitle);
      return {
        id: r.id,
        candidateId: `cand_${r.candidateName}`,
        candidateName: r.candidateName || 'Candidate',
        quizId: r.quizId,
        quizTitle: matchedQuiz?.title || r.quizTitle,
        topic: normalizeTopic(matchedQuiz?.topic || r.topic),
        score: r.score,
        maxScore: r.maxScore,
        percentage: r.percentage,
        timeSpentSeconds: r.timeSpentSeconds,
        attemptedAt: r.attemptedAt
      };
    });

    // Sort by Percentage (descending), then Time Spent (ascending)
    const sorted = formatted.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });

    setEntries(sorted);
  }, [liveQuizzes, liveResults]);

  const quizTitles = ['All Exams (Overall Cumulative)', ...Array.from(new Set(entries.map((e) => normalizeTopic(e.quizTitle)).filter(Boolean)))];
  const subjectItems = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      const name = normalizeTopic(e.topic);
      if (name) {
        acc[name] = (acc[name] || 0) + 1;
      }
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  const filteredEntriesRaw = entries.filter((e) => {
    const matchesSearch =
      e.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.quizTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const normalizedTopic = normalizeTopic(e.topic);
    const matchesTopic = selectedTopic === 'All Topics' || selectedTopic === 'All' || normalizedTopic === selectedTopic;
    const matchesQuiz = selectedQuizTitle === 'All Exams (Overall Cumulative)' || normalizeTopic(e.quizTitle) === selectedQuizTitle;
    return matchesSearch && matchesTopic && matchesQuiz;
  });

  let filteredEntries = filteredEntriesRaw;
  if (selectedQuizTitle === 'All Exams (Overall Cumulative)') {
    const aggregated = new Map<string, LeaderboardEntry>();
    filteredEntriesRaw.forEach(e => {
      if (!aggregated.has(e.candidateName)) {
        aggregated.set(e.candidateName, { 
          ...e, 
          quizTitle: '1 Tests Attempted', 
          score: e.score, 
          maxScore: e.maxScore, 
          timeSpentSeconds: e.timeSpentSeconds,
          attemptsCount: 1 
        });
      } else {
        const existing = aggregated.get(e.candidateName)!;
        existing.score += e.score;
        existing.maxScore += e.maxScore;
        existing.timeSpentSeconds += e.timeSpentSeconds;
        existing.attemptsCount = (existing.attemptsCount || 1) + 1;
        existing.quizTitle = `${existing.attemptsCount} Tests Attempted`;
        existing.percentage = Math.round((existing.score / existing.maxScore) * 100);
        if (new Date(e.attemptedAt) > new Date(existing.attemptedAt)) {
          existing.attemptedAt = e.attemptedAt;
        }
      }
    });
    filteredEntries = Array.from(aggregated.values()).sort((a, b) => {
      // Evalnium Hybrid Rating = Total Score * (Accuracy / 100)
      const ratingA = a.score * (a.percentage / 100);
      const ratingB = b.score * (b.percentage / 100);
      
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });
  }

  const top1 = filteredEntries[0];
  const top2 = filteredEntries[1];
  const top3 = filteredEntries[2];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  // Methodology and scoring explanation section
  const renderMethodologySection = () => (
    <div className="portal-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
        <div>
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            Scoring Methodology
          </span>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
            <Calculator className="w-4 h-4 text-slate-600" />
            <span>How Rankings, Scores & Ratings Are Calculated</span>
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Percent className="w-4 h-4 text-slate-600 shrink-0" />
            <span>1. Score & Accuracy %</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Raw score adds correct marks and subtracts any negative marking penalties:
          </p>
          <div className="p-2 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700 font-semibold">
            Accuracy % = (Marks ÷ Max) × 100
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Clock className="w-4 h-4 text-slate-600 shrink-0" />
            <span>2. Speed Tie-Breaker</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            When two candidates match on accuracy, the candidate who finished in <strong>less time</strong> ranks higher:
          </p>
          <div className="p-2 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700 font-semibold">
            Tie-Breaker: Elapsed Time (Asc)
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Gauge className="w-4 h-4 text-slate-600 shrink-0" />
            <span>3. Candidate Percentile</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Percentile reflects the share of attempts scoring equal to or below your score:
          </p>
          <div className="p-2 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700 font-semibold">
            Percentile = (≤ Score ÷ Total) × 100
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Activity className="w-4 h-4 text-slate-600 shrink-0" />
            <span>4. Cumulative Rating</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Cumulative rankings combine total earned marks with average accuracy across attempts:
          </p>
          <div className="p-2 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700 font-semibold">
            Rating = Total Marks × (Accuracy ÷ 100)
          </div>
        </div>
      </div>
    </div>
  );

  // If visitor is NOT logged in: Show the Protected Leaderboard Gate
  if (!isAuthenticated) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200 select-none">
        {/* Top Header Card */}
        <div className="portal-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Candidate Rankings & Standings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                Competitive rankings and percentiles for UGC NET & SET Library Science practice exams.
              </p>
            </div>

            <span className="self-start sm:self-auto px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-semibold border border-slate-200 inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Candidate Sign-In Required</span>
            </span>
          </div>
        </div>

        {/* Protected Access Gate Card */}
        <div className="portal-card p-6 sm:p-10 text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>

          <div className="max-w-xl mx-auto space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected Portal Data</span>
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Sign In to View Practice Rankings & Scorecards
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Live candidate merit lists, percentiles, and individual test rankings are available to signed-in candidates and evaluators.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Candidate Sign In / Register</span>
            </button>

            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Explore Exam Catalog</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-100 max-w-2xl mx-auto text-left">
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Email OTP Sign Up</strong> with passwordless or standard login.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Live Rank Calculation</strong> updated after every submitted mock test.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Percentile Benchmark</strong> compared across registered aspirants.</span>
            </div>
          </div>
        </div>

        {renderMethodologySection()}

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  // If user IS logged in (Candidate or Admin): Show the Full Leaderboard + Methodology
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="portal-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Candidate Rankings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Real-time standings ordered by score, accuracy, and completion speed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => exportLeaderboardToCSV(filteredEntries)}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Admin Only: Export Rankings CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            <div className="px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold font-mono text-slate-900 tabular-nums">{entries.length}</span>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Attempts Logged</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Display */}
      {filteredEntries.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 items-end">
          {/* Rank 2 (Silver) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3 relative md:order-1">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-300 text-slate-600 flex items-center justify-center shadow-xs">
              <Award className="w-7 h-7" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 uppercase tracking-wide">
              Rank #2 • Silver 🥈
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base truncate">{top2.candidateName}</h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">{top2.quizTitle}</p>
            </div>
            <div className="pt-2.5 border-t border-slate-100">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{top2.percentage}%</span>
              <p className="text-[11px] text-slate-400 font-semibold font-mono tabular-nums">Time: {formatTime(top2.timeSpentSeconds)}</p>
            </div>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div className="bg-gradient-to-b from-amber-500/10 to-white p-6 rounded-2xl border-2 border-amber-300 shadow-md text-center space-y-3 relative md:order-2 md:-translate-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
              <Trophy className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500 text-white uppercase tracking-wider shadow-xs">
              👑 Rank #1 • Champion 🥇
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-lg truncate">{top1.candidateName}</h3>
              <p className="text-xs text-slate-600 truncate font-medium mt-0.5">{top1.quizTitle}</p>
            </div>
            <div className="pt-2.5 border-t border-amber-200/60">
              <span className="text-3xl font-bold font-mono text-amber-950 tabular-nums">{top1.percentage}%</span>
              <p className="text-xs text-amber-700 font-semibold font-mono tabular-nums">Speed: {formatTime(top1.timeSpentSeconds)}</p>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3 relative md:order-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
              <Medal className="w-7 h-7" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 uppercase tracking-wide">
              Rank #3 • Bronze 🥉
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base truncate">{top3.candidateName}</h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">{top3.quizTitle}</p>
            </div>
            <div className="pt-2.5 border-t border-slate-100">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{top3.percentage}%</span>
              <p className="text-[11px] text-slate-400 font-semibold font-mono tabular-nums">Time: {formatTime(top3.timeSpentSeconds)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="portal-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate or paper..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <select
            value={selectedQuizTitle}
            onChange={(e) => setSelectedQuizTitle(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-slate-400 transition-colors cursor-pointer"
          >
            {quizTitles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Topic Filter Bar */}
        <SubjectFilterBar
          allLabel="All Topics"
          items={subjectItems}
          selected={selectedTopic}
          onSelect={setSelectedTopic}
          showIcon
          className="pb-0.5"
        />
      </div>

      {/* Leaderboard Table */}
      <div className="portal-card overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Trophy className="w-9 h-9 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Leaderboard Records Found</p>
            <p className="text-xs">Take an exam or adjust your search filter to view rankings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Candidate Name</th>
                  <th className="px-4 py-3">Exam / Volume</th>
                  <th className="px-4 py-3">Score & Rating</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Time Used</th>
                  <th className="px-4 py-3">Attempt Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEntries.map((entry, idx) => {
                  const rankNum = idx + 1;
                  const isCurrentCandidate = currentUser && currentUser.name && entry.candidateName.toLowerCase() === currentUser.name.toLowerCase();

                  let rankBadge = <span className="font-mono font-semibold text-slate-600 tabular-nums">#{rankNum}</span>;

                  if (rankNum === 1) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px]">🥇 #1 GOLD</span>;
                  else if (rankNum === 2) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px]">🥈 #2 SILVER</span>;
                  else if (rankNum === 3) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px]">🥉 #3 BRONZE</span>;

                  return (
                    <tr 
                      key={entry.id} 
                      className={`transition-colors ${
                        isCurrentCandidate 
                          ? 'bg-blue-50/70 font-semibold border-l-2 border-l-blue-600' 
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">{rankBadge}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                          <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {entry.candidateName.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[180px]">{entry.candidateName}</span>
                          {isCurrentCandidate && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        <span>{entry.quizTitle}</span>
                        {entry.attemptsCount && entry.attemptsCount > 1 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded border border-slate-200 font-mono font-semibold">
                            {entry.attemptsCount} tests
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-900 font-bold font-mono tabular-nums whitespace-nowrap">
                        {entry.score.toFixed(2)} <span className="text-slate-400 font-medium">/ {entry.maxScore}</span>
                        {selectedQuizTitle === 'All Exams (Overall Cumulative)' && (
                          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            Rating: {(entry.score * (entry.percentage / 100)).toFixed(2)} pts
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-mono font-semibold tabular-nums ${
                          entry.percentage >= 80
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : entry.percentage >= 60
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {entry.percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatTime(entry.timeSpentSeconds)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap tabular-nums">
                        {new Date(entry.attemptedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scoring Methodology Reference */}
      {renderMethodologySection()}

    </div>
  );
};
