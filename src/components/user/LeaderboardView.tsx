import React, { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../../types/auth';
import { getStoredResults } from '../../utils/storage';
import { Trophy, Award, Medal, Search, Sparkles, Filter, Clock } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');

  useEffect(() => {
    const results = getStoredResults();
    const formatted: LeaderboardEntry[] = results.map((r) => ({
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

  const topics = ['All', ...Array.from(new Set(entries.map((e) => e.topic)))];

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.quizTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = selectedTopic === 'All' || e.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  const top1 = filteredEntries[0];
  const top2 = filteredEntries[1];
  const top3 = filteredEntries[2];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
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

          <div className="flex items-center space-x-3 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
            <Sparkles className="w-8 h-8 text-indigo-600 flex-shrink-0" />
            <div>
              <span className="text-xl font-black font-mono text-indigo-950">{entries.length}</span>
              <p className="text-[11px] text-indigo-700 font-bold uppercase">Total Exam Rankings Logged</p>
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
              👑 Rank #1 • Champion 🥇
            </span>
            <div>
              <h3 className="font-black text-slate-900 text-lg">{top1.candidateName}</h3>
              <p className="text-xs text-slate-600 truncate font-bold">{top1.quizTitle}</p>
            </div>
            <div className="pt-2 border-t border-amber-200/60">
              <span className="text-3xl font-black font-mono text-amber-950">{top1.percentage}%</span>
              <p className="text-xs text-amber-700 font-bold font-mono">Speed: {formatTime(top1.timeSpentSeconds)}</p>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3 relative md:order-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
              <Medal className="w-7 h-7" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 uppercase">
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name or exam..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 flex items-center space-x-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Topic Filter:</span>
            </span>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedTopic === t
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Ranks Table */}
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Rank</th>
                  <th className="py-3.5 px-5">Candidate Name</th>
                  <th className="py-3.5 px-5">Exam Title</th>
                  <th className="py-3.5 px-5">Score</th>
                  <th className="py-3.5 px-5">Accuracy %</th>
                  <th className="py-3.5 px-5">Completion Time</th>
                  <th className="py-3.5 px-5">Attempt Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredEntries.map((entry, idx) => {
                  const rankNum = idx + 1;
                  let rankBadge = <span className="font-mono font-bold text-slate-700">#{rankNum}</span>;

                  if (rankNum === 1) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px]">🥇 #1 GOLD</span>;
                  else if (rankNum === 2) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px]">🥈 #2 SILVER</span>;
                  else if (rankNum === 3) rankBadge = <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px]">🥉 #3 BRONZE</span>;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5">{rankBadge}</td>
                      <td className="py-4 px-5 font-bold text-slate-900 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {entry.candidateName.charAt(0).toUpperCase()}
                        </div>
                        <span>{entry.candidateName}</span>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-800">{entry.quizTitle}</td>
                      <td className="py-4 px-5 font-mono font-bold">{entry.score} / {entry.maxScore}</td>
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

    </div>
  );
};
