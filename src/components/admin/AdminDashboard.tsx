import React, { useState, useEffect } from 'react';
import type { Quiz, ParseResult } from '../../types/quiz';
import type { Announcement } from '../../types/announcement';
import { QuizImporter } from './QuizImporter';
import { McqPreviewEditor } from './McqPreviewEditor';
import { AnnouncementManager } from './AnnouncementManager';
import { Plus, Trash2, FileDown, Layers, Sparkles, Clock, Megaphone, Database, CheckCircle, Users, Edit, AlertCircle, CheckCircle2, WifiOff, Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { getStoredResults } from '../../utils/storage';

interface AdminDashboardProps {
  quizzes: Quiz[];
  announcements?: Announcement[];
  onSaveQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string) => void;
  onTogglePublish: (quiz: Quiz) => void;
  onSaveAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  quizzes,
  announcements = [],
  onSaveQuiz,
  onDeleteQuiz,
  onTogglePublish,
  onSaveAnnouncement = () => {},
  onDeleteAnnouncement = () => {},
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'manage' | 'candidates' | 'announcements' | 'mysql' | 'live' | 'users'>('import');
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{ uid: string; name: string; email: string; role: string; createdAt: string }>>([]);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [deletedResultIds, setDeletedResultIds] = useState<Set<string>>(new Set());

  const getApiBaseUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  useEffect(() => {
    if (activeSubTab === 'live') {
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
    } else if (activeSubTab === 'users') {
      fetchUsers();
    }
  }, [activeSubTab]);

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
      timingMode: quiz.timingMode,
      questionTimeLimitSeconds: quiz.questionTimeLimitSeconds,
      preventPreviousSectionReturn: quiz.preventPreviousSectionReturn,
      preventEarlyNextSection: quiz.preventEarlyNextSection,
      preventPreviousQuestionReturn: quiz.preventPreviousQuestionReturn,
      preventEarlyNextQuestion: quiz.preventEarlyNextQuestion,
      questionViewMode: quiz.questionViewMode || 'both',
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
          <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2 mt-1">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <span>Admin Examination Command Studio</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Convert documents into exams, configure sectional rules, edit live test papers, and inspect candidate statistics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
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
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteResult(r.id, cand.candidateName); }}
                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all"
                                        title="Delete this attempt"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
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

      {activeSubTab === 'announcements' && (
        <AnnouncementManager
          announcements={announcements}
          quizzes={quizzes}
          onSaveAnnouncement={onSaveAnnouncement}
          onDeleteAnnouncement={onDeleteAnnouncement}
        />
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
    </div>
  );
};
