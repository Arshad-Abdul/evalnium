import React, { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../../types/auth';
import { getStoredResults, getStoredQuizzes } from '../../utils/storage';
import { exportLeaderboardToCSV } from '../../utils/export';
import { 
  Trophy, Award, Medal, Search, Sparkles, Filter, Clock, Download, 
  Lock, LogIn, BookOpen, ShieldCheck, HelpCircle, CheckCircle2, ChevronRight,
  Calculator, Gauge, Activity, Percent
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

interface LeaderboardViewProps {
  onNavigateToCatalog?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onNavigateToCatalog }) => {
  const { currentUser, isAdminAuthenticated } = useAuth();
  const isSuperAdmin = isAdminAuthenticated && currentUser?.role === 'admin';
  const isAuthenticated = Boolean(currentUser) || isSuperAdmin;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState('All Exams (Overall Cumulative)');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const activeQuizzes = getStoredQuizzes();
    const results = getStoredResults();
    
    // Filter out deleted quizzes (Live/Published and Drafted quizzes remain!)
    const validResults = results.filter(r => {
      if (!r.quizId && !r.quizTitle) return false;
      return activeQuizzes.some(q => q.id === r.quizId || q.title === r.quizTitle);
    });

    const formatted: LeaderboardEntry[] = validResults.map((r) => ({
      id: r.id,
      candidateId: `cand_${r.candidateName}`,
      candidateName: r.candidateName || 'Candidate',
      quizId: r.quizId,
      quizTitle: r.quizTitle,
      topic: r.topic,
      score: r.score,
      maxScore: r.maxScore,
      percentage: r.percentage,
      timeSpentSeconds: r.timeSpentSeconds,
      attemptedAt: r.attemptedAt
    }));

    // Sort by Percentage (descending), then Time Spent (ascending)
    const sorted = formatted.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });

    setEntries(sorted);
  }, []);

  const quizTitles = ['All Exams (Overall Cumulative)', ...Array.from(new Set(entries.map((e) => e.quizTitle)))];
  const topics = ['All Topics', ...Array.from(new Set(entries.map((e) => e.topic)))];

  const filteredEntriesRaw = entries.filter((e) => {
    const matchesSearch =
      e.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.quizTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = selectedTopic === 'All Topics' || selectedTopic === 'All' || e.topic === selectedTopic;
    const matchesQuiz = selectedQuizTitle === 'All Exams (Overall Cumulative)' || e.quizTitle === selectedQuizTitle;
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
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
            OFFICIAL EVALUATION CRITERIA
          </span>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2 mt-1">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span>How Rankings, Scores, Percentiles & Ratings Are Calculated</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Standard institutional formulas governing candidate merit positioning, tie-breaking rules, and All-India rankings.
          </p>
        </div>
        <span className="shrink-0 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
          NTA CBT Standard Normalization
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* 1. Raw Scores & Accuracy */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Percent className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-xs">1. Raw Score & Accuracy %</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Raw score equals total marks from correct responses minus penalties for incorrect answers. Accuracy percentage is computed as:
          </p>
          <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-blue-700 font-bold">
            Accuracy % = (Marks Obtained ÷ Max Marks) × 100
          </div>
        </div>

        {/* 2. Speed & Time Spent Tie-Breaker */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-xs">2. Speed & Time Tie-Breaker</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            When two or more candidates achieve the exact same score/accuracy %, the candidate who finished in <strong>lesser elapsed time</strong> ranks higher:
          </p>
          <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-amber-700 font-bold">
            Primary Tie-Breaker: Time Spent (Ascending)
          </div>
        </div>

        {/* 3. National Percentile Score */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Gauge className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-xs">3. National Percentile</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Percentile reflects the proportion of candidates scoring equal to or below a student's score across the test session:
          </p>
          <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-purple-700 font-bold">
            Percentile = (Candidates ≤ Your Score ÷ Total) × 100
          </div>
        </div>

        {/* 4. Evalnium Hybrid Cumulative Rating */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-xs">4. Cumulative Hybrid Rating</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            On the All-Exams Leaderboard, consistency is rewarded. Rating points combine cumulative marks with average accuracy:
          </p>
          <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-emerald-700 font-bold">
            Rating Points = Total Marks × (Accuracy % ÷ 100)
          </div>
        </div>
      </div>
    </div>
  );

  // If visitor is NOT logged in: Show the Protected Leaderboard Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200 select-none">
        {/* Top Header Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider inline-flex items-center space-x-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>All-India Candidate Standings</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Official Evalnium Merit Rankings & Leaderboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
                National benchmarking and competitive percentiles for UGC NET & State SET Library and Information Science.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-800 text-xs font-mono font-bold border border-amber-300/60 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Candidate Restricted</span>
              </span>
            </div>
          </div>
        </div>

        {/* High-Converting Protected Access Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md p-8 sm:p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Lock className="w-10 h-10 text-amber-600" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Authentication Gate</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Sign In to View All-India Rankings & Scorecards
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              To safeguard student privacy and prevent unauthorized score harvesting, live candidate merit lists, percentiles, and individual test rankings are exclusively available to registered candidates and verified evaluators.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Candidate Sign In / Register</span>
            </button>

            {onNavigateToCatalog && (
              <button
                onClick={onNavigateToCatalog}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Explore Exam Catalog</span>
              </button>
            )}
          </div>

          {/* Trust Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-100 max-w-2xl mx-auto text-left">
            <div className="flex items-start space-x-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Free Instant Sign Up</strong> via Email OTP with zero passwords needed.</span>
            </div>
            <div className="flex items-start space-x-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Instant Personal Rank</strong> calculated live after every CBT mock attempt.</span>
            </div>
            <div className="flex items-start space-x-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>National Percentile Benchmark</strong> against actual UGC NET aspirants.</span>
            </div>
          </div>
        </div>

        {/* Transparent Methodology & Scoring Formula Note */}
        {renderMethodologySection()}

        {/* Authentication Modal */}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  // If user IS logged in (Candidate or Admin): Show the Full Leaderboard + Personal Standing + Methodology
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider inline-flex items-center space-x-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Global Candidate Ranks</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Official Evalnium Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-medium">
              Real-time competitive ranking of top candidates worldwide based on score percentage and speed.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isSuperAdmin && (
              <button
                onClick={() => exportLeaderboardToCSV(filteredEntries)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
                title="Admin Only: Export Rankings CSV"
              >
                <Download className="w-4 h-4" />
                <span>Export Ranks to CSV</span>
              </button>
            )}

            <div className="flex items-center space-x-3 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
              <Sparkles className="w-8 h-8 text-indigo-600 flex-shrink-0" />
              <div>
                <span className="text-xl font-black font-mono text-indigo-950">{entries.length}</span>
                <p className="text-[11px] text-indigo-700 font-bold uppercase">Total Exam Rankings Logged</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Display */}
      {filteredEntries.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Rank 2 (Silver) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3 relative md:order-1">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-300 text-slate-600 flex items-center justify-center shadow-xs">
              <Award className="w-7 h-7" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 uppercase">
              Rank #2 • Silver 🥈
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{top2.candidateName}</h3>
              <p className="text-xs text-slate-500 truncate font-medium">{top2.quizTitle}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-2xl font-black font-mono text-slate-900">{top2.percentage}%</span>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">Time: {formatTime(top2.timeSpentSeconds)}</p>
            </div>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div className="bg-gradient-to-b from-amber-500/10 to-white p-6 rounded-3xl border-2 border-amber-300 shadow-lg text-center space-y-3 relative md:order-2 md:-translate-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
              <Trophy className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white uppercase tracking-wider shadow-xs">
              👑 Rank #1 • Champion 🏆
            </span>
            <div>
              <h3 className="font-black text-slate-900 text-lg">{top1.candidateName}</h3>
              <p className="text-xs text-slate-500 truncate font-semibold">{top1.quizTitle}</p>
            </div>
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-3xl font-black font-mono text-amber-600">{top1.percentage}%</span>
              <p className="text-[11px] text-amber-700/80 font-bold font-mono">Speed: {formatTime(top1.timeSpentSeconds)}</p>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3 relative md:order-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
              <Medal className="w-7 h-7" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 uppercase">
              Rank #3 • Bronze 🥉
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{top3.candidateName}</h3>
              <p className="text-xs text-slate-500 truncate font-medium">{top3.quizTitle}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-2xl font-black font-mono text-slate-900">{top3.percentage}%</span>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">Time: {formatTime(top3.timeSpentSeconds)}</p>
            </div>
          </div>

        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search candidate name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={selectedQuizTitle}
              onChange={(e) => setSelectedQuizTitle(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              {quizTitles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Topic Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold flex items-center space-x-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Topic Filter:</span>
          </span>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                selectedTopic === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Trophy className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Leaderboard Logs Found</p>
            <p className="text-xs">Take an exam or adjust your search filter to view rankings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 border-b-2 border-indigo-200">Rank</th>
                  <th className="px-4 py-3 border-b-2 border-indigo-200">Candidate Name</th>
                  <th className="px-4 py-3 border-b-2 border-indigo-200">Exam Title / Volume</th>
                  <th className="px-4 py-3 border-b-2 border-indigo-200">Score & Rating</th>
                  <th className="px-4 py-3 border-b-2 border-indigo-200">Accuracy %</th>
                  <th className="px-4 py-3 border-b-2 border-indigo-200">Completion Time</th>
                  <th className="px-4 py-3 border-b-2 border-indigo-200">Attempt Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredEntries.map((entry, idx) => {
                  const rankNum = idx + 1;
                  const isCurrentCandidate = currentUser && currentUser.name && entry.candidateName.toLowerCase() === currentUser.name.toLowerCase();

                  let rankBadge = <span className="font-mono font-bold text-slate-700">#{rankNum}</span>;

                  if (rankNum === 1) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px]">🥇 #1 GOLD</span>;
                  else if (rankNum === 2) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px]">🥈 #2 SILVER</span>;
                  else if (rankNum === 3) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px]">🥉 #3 BRONZE</span>;

                  return (
                    <tr 
                      key={entry.id} 
                      className={`transition-colors ${
                        isCurrentCandidate 
                          ? 'bg-blue-50/80 font-bold border-l-4 border-blue-600' 
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-4 px-5">{rankBadge}</td>
                      <td className="py-4 px-5 font-bold text-slate-900 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {entry.candidateName.charAt(0).toUpperCase()}
                        </div>
                        <span>{entry.candidateName}</span>
                        {isCurrentCandidate && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-800">
                        {entry.quizTitle}
                        {entry.attemptsCount && entry.attemptsCount > 1 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded border border-indigo-200 font-extrabold uppercase">
                            {entry.attemptsCount} Tests
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-900 font-black font-mono">
                        {entry.score.toFixed(2)} <span className="text-slate-400 font-bold">/ {entry.maxScore}</span>
                        {selectedQuizTitle === 'All Exams (Overall Cumulative)' && (
                          <div className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">
                            Rating: {(entry.score * (entry.percentage / 100)).toFixed(2)} pts
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold ${
                          entry.percentage >= 80
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : entry.percentage >= 60
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {entry.percentage}%
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime(entry.timeSpentSeconds)}</span>
                      </td>
                      <td className="py-4 px-5 text-slate-400 text-[11px]">
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

      {/* Official Calculation Methodology & Merit Formula Note */}
      {renderMethodologySection()}

    </div>
  );
};
