import React, { useState, useEffect } from 'react';
import type { Quiz, ParseResult, QuizAttemptResult } from '../../types/quiz';
import type { Announcement } from '../../types/announcement';
import { QuizImporter } from './QuizImporter';
import { McqPreviewEditor } from './McqPreviewEditor';
import { AnnouncementManager } from './AnnouncementManager';
import { BannerManager } from './BannerManager';
import { AuditLogsManager } from './AuditLogsManager';
import { CandidateResponseModal } from './CandidateResponseModal';
import { Plus, Trash2, FileDown, Layers, Sparkles, Clock, Megaphone, Database, CheckCircle, Users, Edit, AlertCircle, CheckCircle2, WifiOff, Activity, ChevronDown, ChevronRight, Eye, Trophy, LogOut, Globe, Radio, Laptop, Smartphone, Monitor, ShieldCheck, UserCheck, Search, Filter, RefreshCw, Compass, MapPin, Download, Image as ImageIcon, BarChart2, Calendar, TrendingUp, History, Terminal } from 'lucide-react';
import { getStoredResults } from '../../utils/storage';

interface AdminDashboardProps {
  quizzes: Quiz[];
  announcements?: Announcement[];
  onSaveQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string) => void;
  onTogglePublish: (quiz: Quiz) => void;
  onSaveAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  quizzes,
  announcements = [],
  onSaveQuiz,
  onDeleteQuiz,
  onTogglePublish,
  onSaveAnnouncement = () => {},
  onDeleteAnnouncement = () => {},
  onLogout,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'import' | 'manage' | 'candidates' | 'announcements' | 'mysql' | 'live' | 'users' | 'visitors' | 'banners' | 'audit'>('overview');
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{ uid: string; name: string; email: string; role: string; createdAt: string }>>([]);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [deletedResultIds, setDeletedResultIds] = useState<Set<string>>(new Set());
  
  // Visitor Telemetry State
  const [visitorsData, setVisitorsData] = useState<{
    activeVisitors: any[];
    recentVisitorLogs: any[];
    summary?: {
      totalStoredSessions: number;
      todayCount: number;
      yesterdayCount: number;
      last7DaysCount: number;
      last30DaysCount: number;
      registeredTotal: number;
      guestTotal: number;
      desktopTotal: number;
      mobileTotal: number;
      avgDurationSeconds: number;
    };
    dailyTrend?: Array<{ date: string; total: number; registered: number; guests: number }>;
    topPages?: Array<{ page: string; count: number }>;
    topCountries?: Array<{ country: string; count: number }>;
  } | null>(null);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'registered' | 'guest' | 'active'>('all');
  const [visitorTimeRange, setVisitorTimeRange] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days'>('all');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [purgingLogs, setPurgingLogs] = useState(false);
  
  // Executive Dashboard Stats State
  const [stats, setStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const getApiBaseUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/stats`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load registered users immediately on mount so their emails are ready for Whitelist autocomplete
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchVisitors = async (rangeOverride?: string) => {
    try {
      const activeRange = rangeOverride !== undefined ? rangeOverride : visitorTimeRange;
      const res = await fetch(`${getApiBaseUrl()}/admin/visitors?range=${activeRange}`);
      if (res.ok) {
        setVisitorsData(await res.json());
      }
    } catch (e) {
      console.error('Error fetching visitor telemetry:', e);
    } finally {
      setLoadingVisitors(false);
    }
  };

  const handlePurgeLogs = async (days: string) => {
    const confirmMsg = days === 'all'
      ? '⚠️ Are you sure you want to permanently clear ALL visitor history telemetry logs?'
      : `⚠️ Are you sure you want to purge visitor history logs older than ${days} days?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setPurgingLogs(true);
      const res = await fetch(`${getApiBaseUrl()}/admin/visitors/purge?days=${days}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Visitor logs purged successfully.');
        fetchVisitors();
      }
    } catch (err) {
      console.error('Error purging visitor logs:', err);
      alert('Failed to purge visitor logs.');
    } finally {
      setPurgingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'overview') {
      fetchAdminStats();
      const interval = setInterval(fetchAdminStats, 5000); // 5s live updates
      return () => clearInterval(interval);
    } else if (activeSubTab === 'live') {
      const fetchLive = async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/sessions/live`);
          const data = await res.json();
          setLiveSessions(data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchLive();
      const interval = setInterval(fetchLive, 5000);
      return () => clearInterval(interval);
    } else if (activeSubTab === 'visitors') {
      setLoadingVisitors(true);
      fetchVisitors();
      const interval = setInterval(() => fetchVisitors(), 5000);
      return () => clearInterval(interval);
    } else if (activeSubTab === 'users') {
      fetchUsers();
    }
  }, [activeSubTab, visitorTimeRange]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/users`);
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          // If empty, trigger auto sync once to pull from test results
          await fetch(`${getApiBaseUrl()}/users/sync`, { method: 'POST' });
          const syncRes = await fetch(`${getApiBaseUrl()}/users`);
          if (syncRes.ok) {
            setRegisteredUsers(await syncRes.json());
            return;
          }
        }
        setRegisteredUsers(data);
      }
    } catch (e) {
      console.error('Error fetching registered users:', e);
    }
  };

  const handleSyncUsers = async () => {
    try {
      await fetch(`${getApiBaseUrl()}/users/sync`, { method: 'POST' });
      await fetchUsers();
    } catch (e) {
      console.error('Error syncing users:', e);
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"? This will also remove their test history.`)) {
      return;
    }
    try {
      const res = await fetch(`${getApiBaseUrl()}/users/${uid}`, { method: 'DELETE' });
      if (res.ok) {
        setRegisteredUsers(prev => prev.filter(u => u.uid !== uid));
      } else {
        alert('Failed to delete user.');
      }
    } catch (e) {
      console.error('Error deleting user:', e);
      alert('Error deleting user.');
    }
  };

  const [parsedResult, setParsedResult] = useState<{ res: ParseResult; sourceName: string } | null>(null);
  const [viewingResult, setViewingResult] = useState<QuizAttemptResult | null>(null);

  const allAttemptResults = getStoredResults().filter(r => !deletedResultIds.has(r.id));

  const handleDeleteResult = async (resultId: string, candidateName: string) => {
    if (!confirm(`Delete this attempt by "${candidateName}"? This cannot be undone.`)) return;
    try {
      await fetch(`${getApiBaseUrl()}/results/${resultId}`, { method: 'DELETE' });
      setDeletedResultIds(prev => new Set([...prev, resultId]));
      // Also remove from localStorage cache
      const RESULTS_KEY = 'evalnium_results_v3';
      try {
        const cached = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
        localStorage.setItem(RESULTS_KEY, JSON.stringify(cached.filter((r: { id: string }) => r.id !== resultId)));
      } catch {}
    } catch {
      alert('Failed to delete result. Check server connection.');
    }
  };

  // Aggregate candidate statistics
  const candidateStatsMap: Record<string, {
    candidateName: string;
    candidateEmail: string;
    totalAttempts: number;
    totalScorePctSum: number;
    passedCount: number;
    lastAttemptedAt: string;
  }> = {};

  allAttemptResults.forEach(r => {
    const key = r.candidateEmail || r.candidateName || 'Unknown Candidate';
    if (!candidateStatsMap[key]) {
      candidateStatsMap[key] = {
        candidateName: r.candidateName || 'Unknown Candidate',
        candidateEmail: r.candidateEmail || 'Not Provided',
        totalAttempts: 0,
        totalScorePctSum: 0,
        passedCount: 0,
        lastAttemptedAt: r.attemptedAt,
      };
    }
    candidateStatsMap[key].totalAttempts += 1;
    candidateStatsMap[key].totalScorePctSum += r.percentage;
    if (r.passed) candidateStatsMap[key].passedCount += 1;
    if (new Date(r.attemptedAt) > new Date(candidateStatsMap[key].lastAttemptedAt)) {
      candidateStatsMap[key].lastAttemptedAt = r.attemptedAt;
    }
  });

  const candidateList = Object.values(candidateStatsMap);

  const handleParsed = (res: ParseResult, sourceName: string) => {
    setParsedResult({ res, sourceName });
  };

  const handleSaveAndClear = (quiz: Quiz) => {
    onSaveQuiz(quiz);
    setParsedResult(null);
    setActiveSubTab('manage');
  };

  const handleEditQuizClick = (quiz: Quiz) => {
    const parseRes: ParseResult = {
      existingQuizId: quiz.id,
      title: quiz.title,
      description: quiz.description,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      timeLimitMinutes: quiz.timeLimitMinutes,
      passingPercentage: quiz.passingPercentage,
      negativeMarks: quiz.negativeMarks,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleOptions: quiz.shuffleOptions,
      enablePracticeMode: quiz.enablePracticeMode,
      quizType: quiz.quizType,
      scheduledStartDateTime: quiz.scheduledStartDateTime,
      scheduledEndDateTime: quiz.scheduledEndDateTime,
      defaultLanguageMode: quiz.defaultLanguageMode,
      accessCode: quiz.accessCode,
      allowedEmails: quiz.allowedEmails,

      // Granular Admin Controls
      enableCertificate: quiz.enableCertificate,
      enableAntiCheating: quiz.enableAntiCheating,
      maxAttempts: quiz.maxAttempts,
      maxTabSwitches: quiz.maxTabSwitches,
      resultAnnouncementDateTime: quiz.resultAnnouncementDateTime,
      timingMode: quiz.timingMode,
      questionTimeLimitSeconds: quiz.questionTimeLimitSeconds,
      preventPreviousSectionReturn: quiz.preventPreviousSectionReturn,
      preventEarlyNextSection: quiz.preventEarlyNextSection,
      preventPreviousQuestionReturn: quiz.preventPreviousQuestionReturn,
      preventEarlyNextQuestion: quiz.preventEarlyNextQuestion,
      questionViewMode: quiz.questionViewMode || 'both',
      allowManualEarlyMove: quiz.allowManualEarlyMove,
      sectionalConfig: quiz.sectionalConfig?.map(sec => ({
        id: sec.id,
        sectionName: sec.sectionName,
        questionCount: (sec as any).questionCount || sec.questionIds?.length || 5,
        timeLimitMinutes: sec.timeLimitMinutes,
      })),

      questions: quiz.questions.map((q, idx) => ({
        tempId: q.id || `q_${idx}`,
        questionText: q.questionText,
        questionEnglish: q.questionEnglish,
        questionHindi: q.questionHindi,
        options: q.options,
        correctOptionId: q.correctOptionId,
        correctOptionIds: q.correctOptionIds,
        questionType: q.questionType,
        imageUrl: q.imageUrl,
        listI: q.listI,
        listII: q.listII,
        explanation: q.explanation,
        explanationEnglish: q.explanationEnglish,
        explanationHindi: q.explanationHindi,
        marks: q.marks,
        isValid: true,
      })),
      errors: [],
    };
    setParsedResult({ res: parseRes, sourceName: `Editing: ${quiz.title}` });
  };

  const handleExportJSON = (quiz: Quiz) => {
    const jsonStr = JSON.stringify(quiz, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_quiz.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (parsedResult) {
    return (
      <McqPreviewEditor
        parseResult={parsedResult.res}
        sourceFileName={parsedResult.sourceName}
        onBack={() => setParsedResult(null)}
        onSaveQuiz={handleSaveAndClear}
        registeredEmails={registeredUsers.map(u => u.email)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-200">
              EXECUTIVE COMMAND CENTER
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
              MySQL 5050 Live
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex flex-wrap items-center gap-3 mt-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <span>Admin Examination Command Studio</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 hover:border-rose-200 text-[10px] font-extrabold uppercase transition-all flex items-center space-x-1"
                title="Lock Admin Studio and Log Out"
              >
                <LogOut className="w-3 h-3 text-rose-500" />
                <span>Lock Studio</span>
              </button>
            )}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Convert documents into exams, configure sectional rules, edit live test papers, and inspect candidate statistics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'overview'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          
          <button
            onClick={() => setActiveSubTab('import')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'import'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Import Quiz
          </button>
          
          <button
            onClick={() => setActiveSubTab('manage')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'manage'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exams Registry ({quizzes.length})
          </button>

          <button
            onClick={() => setActiveSubTab('candidates')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
              activeSubTab === 'candidates'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Candidate Stats ({candidateList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
              activeSubTab === 'users'
                ? 'bg-white text-rose-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-rose-600" />
            <span>User Accounts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('banners')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
              activeSubTab === 'banners'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Showcase Banners</span>
          </button>

          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
              activeSubTab === 'announcements'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-600" />
            <span>Notices</span>
          </button>

          <button
            onClick={() => setActiveSubTab('visitors')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'visitors'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>Visitor Radar</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block ml-0.5" />
          </button>

          <button
            onClick={() => setActiveSubTab('mysql')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
              activeSubTab === 'mysql'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Database Studio</span>
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'audit'
                ? 'bg-slate-950 text-emerald-400 shadow-xs border border-slate-800'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Audit & Terminal</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block ml-0.5" />
          </button>
          <button
            onClick={() => setActiveSubTab('live')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs flex items-center space-x-2 ${
              activeSubTab === 'live'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Live Exams Tracker</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {loadingStats && !stats ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-3xl border border-slate-200">
              Loading Executive Command Center stats...
            </div>
          ) : stats ? (
            <>
              {/* Analytics Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Visitors */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Visits</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Eye className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-2xl font-black text-slate-900 font-mono">{(stats.totalVisitors || 0).toLocaleString()}</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Unique Visitors Daily</p>
                  </div>
                </div>

                {/* Candidates Online */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Candidates Online</span>
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-2xl font-black text-emerald-600 font-mono">{stats.activeVisitorsCount || 1}</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Active Heartbeats</p>
                  </div>
                </div>

                {/* Live Exams */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Live Exams Running</span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-2xl font-black text-indigo-600 font-mono">{stats.activeExamsCount || 0}</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Candidates currently in CBT</p>
                  </div>
                </div>

                {/* Platform Average */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Platform Average</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Trophy className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-2xl font-black text-amber-600 font-mono">{stats.avgScore || 0}%</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Pass Rate: {stats.passRate || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Weekly Trend and Top Performers Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2-Cols: Weekly trend & Top Candidates */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Attempts Weekly Trend Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      <span>Exams Attempts Weekly Trend</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">This Week</p>
                        <p className="text-2xl font-black text-slate-800 font-mono mt-1">{stats.attemptsThisWeek || 0}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Attempts in past 7 days</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Last Week</p>
                        <p className="text-2xl font-black text-slate-500 font-mono mt-1">{stats.attemptsLastWeek || 0}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Attempts 7-14 days ago</p>
                      </div>
                    </div>

                    {/* Performance percentage increase indicator */}
                    {(() => {
                      const diff = (stats.attemptsThisWeek || 0) - (stats.attemptsLastWeek || 0);
                      const pct = stats.attemptsLastWeek > 0 ? Math.round((diff / stats.attemptsLastWeek) * 100) : 0;
                      return (
                        <div className="mt-4 flex items-center space-x-2 text-xs font-semibold">
                          {diff >= 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                              ▲ +{pct}% Weekly Growth
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-lg">
                              ▼ {Math.abs(pct)}% Weekly Drop
                            </span>
                          )}
                          <span className="text-slate-500 font-medium">compared to last week's attempt load.</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Top 5 Smartest Candidates Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <span>Top 5 Platform Performers (Smartest Candidates)</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Highest average scores computed across all verification tests</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="p-3 text-center">Rank</th>
                            <th className="p-3">Candidate</th>
                            <th className="p-3 text-center">Tests Taken</th>
                            <th className="p-3 text-right">Average Score %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {(!stats.topPerformers || stats.topPerformers.length === 0) ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-400">
                                No candidate attempts recorded yet to rank.
                              </td>
                            </tr>
                          ) : (
                            stats.topPerformers.map((cand: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-center font-bold font-mono">
                                  {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </td>
                                <td className="p-3">
                                  <div>
                                    <div className="text-slate-900 font-bold">{cand.candidateName}</div>
                                    <div className="text-slate-400 text-[10px] font-mono">{cand.candidateEmail}</div>
                                  </div>
                                </td>
                                <td className="p-3 text-center font-mono text-slate-700">{cand.attemptsCount} attempts</td>
                                <td className="p-3 text-right font-mono font-black text-indigo-600 text-sm">
                                  {cand.avgScore}%
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Col: Scrolling Live Activity Feed */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                        <span>Live Terminal Activity Feed</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time examination events & logins</p>
                    </div>
                    <button
                      onClick={() => setActiveSubTab('audit')}
                      className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 transition-colors flex items-center space-x-1"
                      title="Open dedicated Audit Logs & Terminal Vault with filters and pagination"
                    >
                      <Terminal className="w-3 h-3 text-indigo-600" />
                      <span>Open Vault ↗</span>
                    </button>
                  </div>

                  <div className="flex-1 bg-slate-950 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto text-slate-300 border border-slate-800 space-y-3 shadow-inner">
                    {(!stats.liveActivityFeed || stats.liveActivityFeed.length === 0) ? (
                      <p className="text-slate-500 text-center py-20">Waiting for live activities...</p>
                    ) : (
                      stats.liveActivityFeed.map((act: any) => (
                        <div key={act.id} className="border-b border-slate-900 pb-2 last:border-0">
                          <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              act.type === 'live' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-indigo-950 text-indigo-400 border border-indigo-900'
                            }`}>
                              {act.type}
                            </span>
                            <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className={`mt-1 font-semibold ${act.type === 'live' ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {act.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : null}
        </div>
      )}

      {activeSubTab === 'import' && <QuizImporter onParsedResult={handleParsed} />}

      {/* SubTab: User Accounts Management (Delete Users) */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-rose-600" />
                <span>Registered User Accounts (MySQL DB)</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Manage registered candidate profiles and delete unwanted accounts</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSyncUsers}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors border border-indigo-200"
              >
                Sync Exam Candidates
              </button>
              <button
                onClick={fetchUsers}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
              >
                Refresh List
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">User Profile</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Joined Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {registeredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No registered user accounts found in MySQL database.
                    </td>
                  </tr>
                ) : (
                  registeredUsers.map(user => (
                    <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs uppercase border border-rose-100">
                            {user.name ? user.name.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="text-slate-900 font-bold">{user.name || 'Candidate'}</div>
                            <div className="text-slate-400 text-[10px] font-mono">UID: {user.uid}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-700">{user.email}</td>
                      <td className="p-3 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-mono">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.uid, user.name || user.email)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors flex items-center space-x-1 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete User</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab: Candidate Statistics & Inspector (Addressing Point #3!) */}
      {activeSubTab === 'candidates' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Registered Candidate Performance Inspector</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Overview of candidate test attempt histories, average scores, and pass rates</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Total Tests Taken</th>
                  <th className="p-3">Average Score %</th>
                  <th className="p-3">Exams Passed</th>
                  <th className="p-3">Last Active Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {candidateList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No candidate attempt statistics recorded yet.
                    </td>
                  </tr>
                ) : (
                  candidateList.map(cand => {
                    const avg = Math.round(cand.totalScorePctSum / cand.totalAttempts);
                    const key = `${cand.candidateName}_${cand.candidateEmail}`;
                    const isExpanded = expandedCandidate === key;
                    const candAttempts = allAttemptResults.filter(r =>
                      (r.candidateEmail && r.candidateEmail === cand.candidateEmail) ||
                      (!r.candidateEmail && r.candidateName === cand.candidateName)
                    );
                    return (
                      <React.Fragment key={key}>
                        <tr
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedCandidate(isExpanded ? null : key)}
                        >
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase border border-indigo-100">
                                {cand.candidateName.charAt(0)}
                              </div>
                              <div>
                                <div className="text-slate-900 font-bold">{cand.candidateName}</div>
                                <div className="text-slate-400 text-[10px] font-mono">{cand.candidateEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-700">{cand.totalAttempts} Exams</td>
                          <td className="p-3 font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              avg >= 60 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {avg}%
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-700">{cand.passedCount} Passed</td>
                          <td className="p-3 text-slate-500 font-mono">
                            {new Date(cand.lastAttemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Individual Attempts</p>
                                {candAttempts.length === 0 ? (
                                  <p className="text-xs text-slate-400">No individual attempts visible.</p>
                                ) : (
                                  candAttempts.map(r => (
                                    <div key={r.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-2xs">
                                      <div className="flex items-center space-x-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                          {r.percentage}% {r.passed ? '✓' : '✗'}
                                        </span>
                                        <span className="font-semibold text-slate-800 text-xs">{r.quizTitle}</span>
                                        <span className="text-slate-400 text-[10px] font-mono">{new Date(r.attemptedAt).toLocaleDateString()}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setViewingResult(r as QuizAttemptResult); }}
                                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-all flex items-center space-x-1"
                                          title="View detailed responses"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span className="text-[10px] font-bold uppercase hidden sm:inline">Responses</span>
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteResult(r.id, cand.candidateName); }}
                                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all"
                                          title="Delete this attempt"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab: Live Exams Tracker */}
      {activeSubTab === 'live' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              Real-Time Active Examinations
            </h2>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-xs">
              {liveSessions.length} Active Sessions
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Time Remaining</th>
                  <th className="px-4 py-3">Last Ping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {liveSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-bold">
                      No candidates currently taking exams.
                    </td>
                  </tr>
                ) : (
                  liveSessions.map((session, idx) => {
                    const secsSincePing = Math.round((Date.now() - session.lastSeen) / 1000);
                    const pct = Math.min(100, Math.max(0, session.percentageComplete || 0));
                    const isCompleted = pct >= 100;
                    const isTimedOut = session.timeRemaining <= 0;
                    const isIdle = !isCompleted && !isTimedOut && secsSincePing > 30;
                    const quizTitle = quizzes.find(q => q.id === session.quizId)?.title || session.quizId;

                    let statusBadge;
                    if (isCompleted) {
                      statusBadge = (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          <CheckCircle2 className="w-3 h-3" /><span>Completed</span>
                        </span>
                      );
                    } else if (isTimedOut) {
                      statusBadge = (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-bold">
                          <AlertCircle className="w-3 h-3" /><span>Timed Out</span>
                        </span>
                      );
                    } else if (isIdle) {
                      statusBadge = (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                          <WifiOff className="w-3 h-3" /><span>Idle</span>
                        </span>
                      );
                    } else {
                      statusBadge = (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          <Activity className="w-3 h-3 animate-pulse" /><span>In Progress</span>
                        </span>
                      );
                    }

                    return (
                      <tr key={idx} className={`hover:bg-slate-50 transition-colors ${
                        isCompleted ? 'bg-emerald-50/30' :
                        isTimedOut ? 'bg-slate-50/60 opacity-60' :
                        isIdle ? 'bg-amber-50/30' : ''
                      }`}>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {session.candidateName}
                          {session.candidateEmail && (
                            <div className="text-[10px] text-slate-500 font-normal">{session.candidateEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 leading-tight">{quizTitle}</div>
                          <div className="text-[10px] font-mono text-slate-400">{session.quizId}</div>
                        </td>
                        <td className="px-4 py-3 text-[11px]">{statusBadge}</td>
                        <td className="px-4 py-3">
                          <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-rose-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{pct}% Answered</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: session.timeRemaining < 120 ? '#e11d48' : '#475569' }}>
                          {session.timeRemaining > 0 ? `${Math.floor(session.timeRemaining / 60)}m ${session.timeRemaining % 60}s` : 'Expired'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {secsSincePing < 60 ? `${secsSincePing}s ago` : `${Math.floor(secsSincePing / 60)}m ago`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab: MySQL Live Database Status Studio (Replaces legacy Cloud tab - Addressing Point #5!) */}
      {activeSubTab === 'mysql' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <span>MySQL Production Backend Database Studio</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Real-time status of `evalnium_db` on Express Server Port 5050</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs font-bold flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>MySQL 5050 Connected</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">Database Engine Specifications:</h3>
              <div className="space-y-2 font-mono text-[11px] text-slate-700">
                <div className="flex justify-between p-2 rounded-xl bg-white border">
                  <span>Host & Port:</span>
                  <span className="font-bold text-indigo-700">localhost:3306</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white border">
                  <span>Database Name:</span>
                  <span className="font-bold text-indigo-700">evalnium_db</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white border">
                  <span>API Base Endpoint:</span>
                  <span className="font-bold text-indigo-700">http://10.24.65.78:5050/api</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white border">
                  <span>Query Latency:</span>
                  <span className="font-bold text-emerald-600">&lt; 10 ms (Indexed)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs font-medium leading-relaxed">
              <h3 className="font-bold text-slate-900 text-sm">MySQL Database Integration Status:</h3>
              <p className="text-slate-600">
                1. 🟢 All Quiz definitions, MCQ questions, and Sectional timing rules persist in MySQL table `quizzes`.
              </p>
              <p className="text-slate-600">
                2. 🟢 All Candidate test attempts and rankings persist in MySQL table `results` indexed by `quiz_id` & `candidate_name`.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SubTab: Visitor Intelligence & Live Device Radar */}
      {activeSubTab === 'visitors' && (
        <div className="space-y-6">
          {/* Header & Control Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-200">
                    REAL-TIME & HISTORICAL ARCHIVE
                  </span>
                  <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Radar Pulse</span>
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2 mt-1.5">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  <span>Visitor Intelligence & Historical Traffic Radar</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Comprehensive real-time telemetry and permanent database session history of student traffic, device fingerprints, exam paths, and session durations.
                </p>
              </div>

              {/* Time Range Filter Buttons & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Range Selector */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: '7days', label: 'Last 7 Days' },
                    { id: '30days', label: 'Last 30 Days' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setVisitorTimeRange(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        visitorTimeRange === tab.id
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setLoadingVisitors(true);
                    fetchVisitors();
                  }}
                  disabled={loadingVisitors}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  title="Refresh visitor logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loadingVisitors ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => {
                    if (!visitorsData?.recentVisitorLogs?.length) return;
                    const headers = ['ID', 'Session ID', 'IP Address', 'Country', 'Candidate Name', 'Candidate Email', 'Is Registered', 'OS', 'Browser', 'Device Type', 'Current Page', 'Visit Count', 'Duration (Seconds)', 'First Seen', 'Last Seen'];
                    const rows = visitorsData.recentVisitorLogs.map(v => [
                      v.id,
                      `"${v.sessionId}"`,
                      `"${v.ipAddress || ''}"`,
                      `"${v.country || ''}"`,
                      `"${v.candidateName || ''}"`,
                      `"${v.candidateEmail || ''}"`,
                      v.isRegistered ? 'YES' : 'NO',
                      `"${v.os || ''}"`,
                      `"${v.browser || ''}"`,
                      `"${v.deviceType || ''}"`,
                      `"${v.currentPage || ''}"`,
                      v.visitCount || 1,
                      v.durationSeconds || 0,
                      `"${v.firstSeen || ''}"`,
                      `"${v.lastSeen || ''}"`,
                    ]);
                    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `evalnium_visitor_telemetry_${visitorTimeRange}_${Date.now()}.csv`);
                    link.click();
                  }}
                  disabled={!visitorsData?.recentVisitorLogs?.length}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  title="Export telemetry data as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                {/* Purge Menu */}
                <button
                  onClick={() => {
                    const days = prompt("Purge historical visitor logs older than N days (enter number of days, e.g., '30', '7', or 'all'):", "30");
                    if (days) handlePurgeLogs(days.trim());
                  }}
                  disabled={purgingLogs}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  title="Purge old visitor records"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{purgingLogs ? 'Purging...' : 'Purge Logs'}</span>
                </button>
              </div>
            </div>

            {/* Top 5 KPI Metrics */}
            {(() => {
              const activeCount = visitorsData?.activeVisitors?.length || 0;
              const summary = visitorsData?.summary;
              const totalLogs = visitorsData?.recentVisitorLogs?.length || 0;
              const registeredCount = visitorsData?.recentVisitorLogs?.filter(v => v.isRegistered).length || 0;
              const guestCount = totalLogs - registeredCount;
              const desktopCount = visitorsData?.recentVisitorLogs?.filter(v => v.deviceType === 'Desktop').length || 0;
              const mobileCount = visitorsData?.recentVisitorLogs?.filter(v => v.deviceType === 'Mobile' || v.deviceType === 'Tablet').length || 0;
              const avgDuration = summary?.avgDurationSeconds || 0;
              const avgDurationStr = avgDuration > 60 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : `${avgDuration}s`;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Active Now */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Live Heartbeats</span>
                      <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                        <Radio className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-slate-900 font-mono">{activeCount}</span>
                        <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                          <span>Active Now</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Heartbeat in past 60s</p>
                    </div>
                  </div>

                  {/* Filtered Period Traffic */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {visitorTimeRange === 'all' ? 'All-Time Traffic' : visitorTimeRange === 'today' ? "Today's Visits" : visitorTimeRange === 'yesterday' ? "Yesterday's Visits" : visitorTimeRange === '7days' ? 'Past 7 Days' : 'Past 30 Days'}
                      </span>
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                        <Users className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-slate-900 font-mono">{totalLogs}</span>
                        <span className="text-[10px] font-bold text-indigo-600 font-mono">Sessions</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Total stored: {summary?.totalStoredSessions || totalLogs} in archive
                      </p>
                    </div>
                  </div>

                  {/* Registered vs Guest */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">User Identity</span>
                      <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-indigo-700 font-mono">{registeredCount} Member</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-sm font-bold text-slate-600 font-mono">{guestCount} Guest</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${totalLogs ? Math.round((registeredCount / totalLogs) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Avg Session Duration */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Avg Duration</span>
                      <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                        <Clock className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900 font-mono">{avgDurationStr}</span>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Time spent on portal</p>
                    </div>
                  </div>

                  {/* Device Platform */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Device Platform</span>
                      <span className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
                        <Laptop className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-800 font-mono">{desktopCount} Desktop</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-sm font-bold text-slate-600 font-mono">{mobileCount} Mobile</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Form factor footprint</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 14-Day Daily Activity Trend Visualizer */}
            {visitorsData?.dailyTrend && visitorsData.dailyTrend.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      14-Day Traffic Velocity & Daily Volume
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] font-bold">
                    <span className="flex items-center space-x-1 text-indigo-700">
                      <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                      <span>Registered Members</span>
                    </span>
                    <span className="flex items-center space-x-1 text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
                      <span>Guests</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2 items-end min-h-[90px]">
                  {(() => {
                    const maxVal = Math.max(...visitorsData.dailyTrend.map(d => d.total || 1), 1);
                    return visitorsData.dailyTrend.map((d, i) => {
                      const heightPct = Math.max(Math.round((d.total / maxVal) * 100), 12);
                      const regPct = d.total ? Math.round((d.registered / d.total) * 100) : 0;
                      const dateShort = d.date ? d.date.substring(5) : '';

                      return (
                        <div key={i} className="flex flex-col items-center group">
                          <span className="text-[9px] font-mono font-bold text-slate-600 mb-1 group-hover:text-indigo-600 transition-colors">
                            {d.total}
                          </span>
                          <div
                            className="w-full max-w-[28px] rounded-t-lg bg-slate-200 overflow-hidden flex flex-col justify-end transition-all hover:brightness-95"
                            style={{ height: `${heightPct}px` }}
                            title={`${d.date}: ${d.total} visits (${d.registered} registered, ${d.guests} guests)`}
                          >
                            <div className="w-full bg-slate-300" style={{ height: `${100 - regPct}%` }} />
                            <div className="w-full bg-indigo-600" style={{ height: `${regPct}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-[40px]">
                            {dateShort}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Quick Analytics Breakdown: Top Pages & Geographies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Pages */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Top Visited Examination Pages</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ranked</span>
                </div>

                <div className="space-y-2">
                  {visitorsData?.topPages && visitorsData.topPages.length > 0 ? (
                    visitorsData.topPages.slice(0, 5).map((p, idx) => {
                      const total = visitorsData?.recentVisitorLogs?.length || 1;
                      const pct = Math.round((p.count / total) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-800 font-mono truncate max-w-[240px]">{p.page || 'Home / Catalog'}</span>
                            <span className="text-slate-500 font-mono text-[11px]">{p.count} visits ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">No page data recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Top Countries / Geographies */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Geographic Footprint & Origins</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Regions</span>
                </div>

                <div className="space-y-2">
                  {visitorsData?.topCountries && visitorsData.topCountries.length > 0 ? (
                    visitorsData.topCountries.slice(0, 5).map((c, idx) => {
                      const total = visitorsData?.recentVisitorLogs?.length || 1;
                      const pct = Math.round((c.count / total) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-800 truncate max-w-[240px]">📍 {c.country || 'India'}</span>
                            <span className="text-slate-500 font-mono text-[11px]">{c.count} sessions ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">No geographic data recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by IP, Name, Email, Country, OS, Browser, Page..."
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setVisitorFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    visitorFilter === 'all'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Logs
                </button>
                <button
                  onClick={() => setVisitorFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
                    visitorFilter === 'active'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Active Now</span>
                </button>
                <button
                  onClick={() => setVisitorFilter('registered')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    visitorFilter === 'registered'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Registered Users
                </button>
                <button
                  onClick={() => setVisitorFilter('guest')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    visitorFilter === 'guest'
                      ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Guests
                </button>
              </div>
            </div>
          </div>

          {/* Telemetry Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-2">
                <Radio className="w-3.5 h-3.5 text-indigo-600" />
                <span>Live Telemetry & Historical Session Grid</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">Auto-polling every 5 seconds</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50/80 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-4 py-3">Pulse</th>
                    <th className="px-4 py-3">Visitor Identity</th>
                    <th className="px-4 py-3">IP Address & Origin</th>
                    <th className="px-4 py-3">Device & Environment</th>
                    <th className="px-4 py-3">Current Location (Page)</th>
                    <th className="px-4 py-3">Session Pulses & Duration</th>
                    <th className="px-4 py-3">Lifetime Visits (IP / User)</th>
                    <th className="px-4 py-3">First Seen</th>
                    <th className="px-4 py-3">Last Active Pulse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {(() => {
                    const logs = visitorsData?.recentVisitorLogs || [];
                    const activeMap = new Set((visitorsData?.activeVisitors || []).map(a => a.sessionId));

                    const filtered = logs.filter(v => {
                      const isActive = activeMap.has(v.sessionId);
                      if (visitorFilter === 'active' && !isActive) return false;
                      if (visitorFilter === 'registered' && !v.isRegistered) return false;
                      if (visitorFilter === 'guest' && v.isRegistered) return false;

                      if (visitorSearch.trim()) {
                        const q = visitorSearch.toLowerCase();
                        const matchName = (v.candidateName || '').toLowerCase().includes(q);
                        const matchEmail = (v.candidateEmail || '').toLowerCase().includes(q);
                        const matchIp = (v.ipAddress || '').toLowerCase().includes(q);
                        const matchCountry = (v.country || '').toLowerCase().includes(q);
                        const matchOs = (v.os || '').toLowerCase().includes(q);
                        const matchBrowser = (v.browser || '').toLowerCase().includes(q);
                        const matchPage = (v.currentPage || '').toLowerCase().includes(q);
                        if (!matchName && !matchEmail && !matchIp && !matchCountry && !matchOs && !matchBrowser && !matchPage) {
                          return false;
                        }
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <Globe className="w-8 h-8 text-slate-300 stroke-1" />
                              <p className="text-xs font-bold text-slate-600">No visitor records matching your current filter.</p>
                              <p className="text-[11px] text-slate-400">Heartbeats will automatically record as visitors navigate the portal.</p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((v, idx) => {
                      const isActive = activeMap.has(v.sessionId);
                      const lastSeenDate = v.lastSeen ? new Date(v.lastSeen) : null;
                      const firstSeenDate = v.firstSeen ? new Date(v.firstSeen) : null;
                      const secsSince = lastSeenDate ? Math.round((Date.now() - lastSeenDate.getTime()) / 1000) : 9999;

                      let timeAgoStr = 'Unknown';
                      if (secsSince < 10) timeAgoStr = 'Just now';
                      else if (secsSince < 60) timeAgoStr = `${secsSince}s ago`;
                      else if (secsSince < 3600) timeAgoStr = `${Math.floor(secsSince / 60)}m ago`;
                      else if (secsSince < 86400) timeAgoStr = `${Math.floor(secsSince / 3600)}h ago`;
                      else timeAgoStr = `${Math.floor(secsSince / 86400)}d ago`;

                      const durationSec = v.durationSeconds || 0;
                      const durationDisplay = durationSec > 60
                        ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
                        : `${durationSec}s`;

                      const DeviceIcon = v.deviceType === 'Mobile' ? Smartphone : v.deviceType === 'Tablet' ? Smartphone : Laptop;

                      return (
                        <tr
                          key={v.id || idx}
                          className={`hover:bg-slate-50 transition-colors ${isActive ? 'bg-emerald-50/20' : ''}`}
                        >
                          {/* Pulse / Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isActive ? (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                                <span>LIVE</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                                <span>Offline</span>
                              </span>
                            )}
                          </td>

                          {/* Candidate / Visitor Identity */}
                          <td className="px-4 py-3">
                            {v.isRegistered ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-900">{v.candidateName || 'Registered User'}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Member
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">{v.candidateEmail || 'No email stored'}</div>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-semibold text-slate-700">{v.candidateName || 'Guest Visitor'}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    Guest
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={v.sessionId}>
                                  ID: {v.sessionId?.substring(0, 14)}...
                                </div>
                              </div>
                            )}
                          </td>

                          {/* IP Address & Country */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="font-mono font-bold text-slate-800 text-[11px]">
                                {v.ipAddress || '127.0.0.1'}
                              </div>
                              <div className="flex items-center space-x-1 text-[10px] text-slate-500">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                <span className="font-semibold">{v.country || 'India 🇮🇳'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Device & Environment */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                <DeviceIcon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-[11px]">
                                  {v.os || 'Windows'} • {v.browser || 'Chrome'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {v.deviceType || 'Desktop'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Active Location (Current Page) */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200">
                              <Compass className="w-3 h-3 text-indigo-500" />
                              <span className="font-bold">{v.currentPage || '/'}</span>
                            </div>
                          </td>

                          {/* Visits & Duration */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="font-mono font-bold text-slate-800 text-[11px] flex items-center space-x-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px]">
                                  {v.visitCount || 1} {v.visitCount === 1 ? 'pulse' : 'pulses'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{durationDisplay}</span>
                              </div>
                            </div>
                          </td>

                          {/* Lifetime Total Visits: IP & User Count */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold" title="Total lifetime visits recorded from this IP address">
                                  🌐 IP: {v.ipTotalVisits || 1} {v.ipTotalVisits === 1 ? 'visit' : 'visits'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                {v.isRegistered && v.candidateEmail ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold" title="Total lifetime sessions from this registered candidate">
                                    👤 User: {v.userTotalVisits || 1} {v.userTotalVisits === 1 ? 'login' : 'logins'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-mono text-[9px]">
                                    👤 User: Guest (N/A)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* First Seen */}
                          <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-slate-500">
                            {firstSeenDate
                              ? `${firstSeenDate.toLocaleDateString()} ${firstSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'N/A'}
                          </td>

                          {/* Last Active Pulse */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="font-mono font-bold text-slate-800 text-[11px]">
                                {timeAgoStr}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {lastSeenDate
                                  ? `${lastSeenDate.toLocaleDateString()} ${lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : 'N/A'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'announcements' && (
        <AnnouncementManager
          announcements={announcements}
          quizzes={quizzes}
          onSaveAnnouncement={onSaveAnnouncement}
          onDeleteAnnouncement={onDeleteAnnouncement}
        />
      )}

      {activeSubTab === 'banners' && (
        <BannerManager quizzes={quizzes} />
      )}

      {activeSubTab === 'audit' && (
        <AuditLogsManager />
      )}

      {/* SubTab: Exams Registry with Edit Button (Addressing Point #4!) */}
      {activeSubTab === 'manage' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Published Exams Registry</span>
            </h2>
            <button
              onClick={() => setActiveSubTab('import')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Exam</span>
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium text-xs">
              No exams published yet. Click "Import Quiz" above to upload your first exam file.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {quiz.topic}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{quiz.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{quiz.description}</p>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono pt-0.5">
                      <span>{quiz.questions.length} Questions</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{quiz.timeLimitMinutes} Mins</span>
                      </span>
                      <span>•</span>
                      <span>Pass: {quiz.passingPercentage}%</span>
                      {quiz.negativeMarks ? <span className="text-rose-600 font-bold">• Neg: -{quiz.negativeMarks}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Edit Quiz Button (Addressing Point #4!) */}
                    <button
                      onClick={() => handleEditQuizClick(quiz)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center space-x-1 transition-all"
                      title="Edit questions, time limit, and sectional rules"
                    >
                      <Edit className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit Quiz</span>
                    </button>

                    <button
                      onClick={() => onTogglePublish(quiz)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        quiz.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {quiz.isPublished ? 'Published' : 'Draft'}
                    </button>

                    <button
                      onClick={() => handleExportJSON(quiz)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      title="Export JSON"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteQuiz(quiz.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {viewingResult && (
        <CandidateResponseModal
          attemptResult={viewingResult}
          quiz={quizzes.find(q => q.id === viewingResult.quizId) || null}
          onClose={() => setViewingResult(null)}
        />
      )}
    </div>
  );
};
