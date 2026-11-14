import { useState, useEffect, lazy, Suspense } from 'react';
import type { Quiz, QuizAttemptResult } from './types/quiz';
import type { Announcement } from './types/announcement';
import {
  getStoredQuizzes,
  saveQuiz,
  toggleQuizPublishInCloud,
  deleteQuiz,
  getStoredResults,
  saveResult,
  syncQuizzesFromMySQL,
  syncResultsFromMySQL,
  syncAnnouncementsFromMySQL,
  saveAnnouncementToCloud,
  deleteAnnouncementFromCloud,
  getStoredAnnouncements,
  ANNOUNCEMENTS_KEY,
} from './utils/storage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AdminLockModal } from './components/admin/AdminLockModal';
import { TopicCatalog } from './components/user/TopicCatalog';
import { AuthModal } from './components/auth/AuthModal';
import { QuizInstructionsModal } from './components/user/QuizInstructionsModal';
import { ScrollToTopButton } from './components/common/ScrollToTopButton';
import { AnnouncementBanner } from './components/user/AnnouncementBanner';
import { HeaderAdBanner } from './components/home/HeaderAdBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LegalPolicyModal } from './components/common/LegalPolicyModal';

// Resilient lazy loader: handles chunk loading retries and legacy port synchronization
const lazyWithRetry = <T extends React.ComponentType<any>>(componentImport: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      console.warn('Initial dynamic import failed. Checking origin and retrying...', error);
      // Auto-recover if the browser was loaded on legacy port 5173
      if (typeof window !== 'undefined' && window.location.port === '5173') {
        window.location.port = '5175';
        return { default: (() => null) as unknown as T };
      }
      // Wait 300ms and retry once
      await new Promise(res => setTimeout(res, 300));
      return await componentImport();
    }
  });

const AdminDashboard = lazyWithRetry(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LeaderboardView = lazyWithRetry(() => import('./components/user/LeaderboardView').then(m => ({ default: m.LeaderboardView })));
const CandidateDashboard = lazyWithRetry(() => import('./components/user/CandidateDashboard').then(m => ({ default: m.CandidateDashboard })));
const ExamRunner = lazyWithRetry(() => import('./components/user/ExamRunner').then(m => ({ default: m.ExamRunner })));
const ExamResultView = lazyWithRetry(() => import('./components/user/ExamResultView').then(m => ({ default: m.ExamResultView })));
const RevisionHubModal = lazyWithRetry(() => import('./components/user/RevisionHubModal').then(m => ({ default: m.RevisionHubModal })));

function MainAppContent() {
  const { isAdminAuthenticated, logoutAdmin, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'dashboard' | 'leaderboard' | 'admin'>('user');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attemptsHistory, setAttemptsHistory] = useState<QuizAttemptResult[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [showAdminLockModal, setShowAdminLockModal] = useState<boolean>(false);
  const [showRevisionHubModal, setShowRevisionHubModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  
  // Real-Time Visitor & Heartbeat Stats
  const [totalVisitors, setTotalVisitors] = useState<number>(0);
  const [activeVisitorsCount, setActiveVisitorsCount] = useState<number>(0);
  
  // Passcode Protection Global State
  const [pendingPasscodeQuiz, setPendingPasscodeQuiz] = useState<Quiz | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Exam Workflow State
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [examPhase, setExamPhase] = useState<'catalog' | 'instructions' | 'running' | 'results'>('catalog');
  const [candidateName, setCandidateName] = useState('Candidate');
  const [lastResult, setLastResult] = useState<QuizAttemptResult | null>(null);

  const refreshDataFromMySQL = async () => {
    const cloudQuizzes = await syncQuizzesFromMySQL();
    if (cloudQuizzes) setQuizzes(cloudQuizzes);

    const cloudResults = await syncResultsFromMySQL();
    if (cloudResults) setAttemptsHistory(cloudResults);

    const cloudAnns = await syncAnnouncementsFromMySQL();
    if (cloudAnns) setAnnouncements(cloudAnns);
  };

  useEffect(() => {
    setQuizzes(getStoredQuizzes());
    setAttemptsHistory(getStoredResults());
    setAnnouncements(getStoredAnnouncements());

    // Fetch initial data from MySQL database server
    refreshDataFromMySQL();

    // Auto-poll MySQL server every 3 seconds for real-time multi-computer sync
    const timer = setInterval(refreshDataFromMySQL, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser?.name) {
      setCandidateName(currentUser.name);
    }
    refreshDataFromMySQL();
  }, [currentUser?.uid, isAdminAuthenticated]);

  // Client ID helper for heartbeat tracking
  const getClientId = () => {
    let id = localStorage.getItem('evalnium_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('evalnium_client_id', id);
    }
    return id;
  };

  const logPageVisit = async () => {
    try {
      await fetch('/api/site/visit', { method: 'POST' }).catch(() => {
        const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
        return fetch(`http://${host}:5050/api/site/visit`, { method: 'POST' });
      });
    } catch {}
  };

  const sendHeartbeat = async () => {
    try {
      const clientId = getClientId();
      const isAdminSession = Boolean(isAdminAuthenticated || activeTab === 'admin');
      const currentPage = examPhase === 'running' 
        ? `Taking Exam: ${selectedQuiz?.title || 'CBT Assessment'}` 
        : (activeTab === 'dashboard' ? 'Candidate Dashboard' : (activeTab === 'leaderboard' ? 'Live Rankings' : (activeTab === 'admin' ? 'Admin Studio' : 'Exam Catalog')));

      const body = JSON.stringify({
        clientId,
        name: isAdminSession && !currentUser ? 'Administrator' : (currentUser?.name || 'Guest Candidate'),
        email: isAdminSession && !currentUser ? null : (currentUser?.email || null),
        role: isAdminSession ? 'admin' : (currentUser?.role || 'guest'),
        isRegistered: Boolean(currentUser),
        currentPage,
        clientCountry: 'India'
      });

      const res = await fetch('/api/site/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body
      }).catch(() => {
        const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
        return fetch(`http://${host}:5050/api/site/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body
        });
      });
      if (res && res.ok) {
        const data = await res.json();
        setTotalVisitors(data.totalVisitors || 0);
        setActiveVisitorsCount(data.activeVisitorsCount || 0);
      }
    } catch {}
  };

  // Log visit and run heartbeat
  useEffect(() => {
    logPageVisit();
    sendHeartbeat();
    const heartbeatTimer = setInterval(sendHeartbeat, 20000);
    return () => clearInterval(heartbeatTimer);
  }, [currentUser, isAdminAuthenticated, activeTab]);

  const clearAdminUrlTrigger = () => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#/admin' || window.location.pathname === '/admin') {
      const nextPath = window.location.pathname === '/admin' ? '/' : window.location.pathname;
      window.history.replaceState(null, '', `${nextPath}${window.location.search}`);
    }
  };

  const triggerPrivateAdminGate = () => {
    if (currentUser && currentUser.role !== 'admin') return;
    if (isAdminAuthenticated) {
      setShowAdminLockModal(false);
      setActiveTab('admin');
      clearAdminUrlTrigger();
    } else {
      setShowAdminLockModal(true);
    }
  };

  useEffect(() => {
    const checkAdminRoute = () => {
      if (window.location.hash === '#/admin' || window.location.pathname === '/admin') {
        triggerPrivateAdminGate();
      }
    };

    const handleAdminShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        triggerPrivateAdminGate();
      }
    };

    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('keydown', handleAdminShortcut);
    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('keydown', handleAdminShortcut);
    };
  }, [isAdminAuthenticated, currentUser]);

  const handleTabChange = (tab: 'user' | 'dashboard' | 'leaderboard' | 'admin') => {
    if (tab === 'admin') {
      if (!isAdminAuthenticated) {
        setShowAdminLockModal(true);
      } else {
        setActiveTab('admin');
      }
    } else if (tab === 'user') {
      setActiveTab('user');
      setExamPhase('catalog');
      setSelectedQuiz(null);
    } else {
      setActiveTab(tab);
    }
  };

  const handleUnlockAdmin = () => {
    setShowAdminLockModal(false);
    setActiveTab('admin');
    clearAdminUrlTrigger();
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setActiveTab('user');
  };

  const handleSaveQuiz = (quiz: Quiz) => {
    const updated = saveQuiz(quiz);
    setQuizzes(updated);
    refreshDataFromMySQL();
  };

  const handleDeleteQuiz = (id: string) => {
    const updated = deleteQuiz(id);
    setQuizzes(updated);
    refreshDataFromMySQL();
  };

  const handleTogglePublish = async (quiz: Quiz) => {
    const nextState = !quiz.isPublished;
    const updatedQuiz = { ...quiz, isPublished: nextState };

    // 1. Immediate optimistic UI update
    setQuizzes(prev => prev.map(q => q.id === quiz.id ? updatedQuiz : q));
    saveQuiz(updatedQuiz);

    // 2. Persist directly to MySQL in background
    await toggleQuizPublishInCloud(quiz.id, nextState);

    // 3. Re-sync from MySQL cleanly
    await refreshDataFromMySQL();
  };

  const handleSaveAnnouncement = (ann: Announcement) => {
    const updated = [ann, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updated));
    saveAnnouncementToCloud(ann);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updated));
    deleteAnnouncementFromCloud(id);
  };

  // Exam handlers
  const handleSelectQuiz = (quiz: Quiz) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (quiz.hasAccessCode || quiz.accessCode) {
      setPendingPasscodeQuiz(quiz);
      setPasscodeInput('');
      setPasscodeError('');
      return;
    }
    if (quiz.questions.length === 0) {
      setPortalNotice(`"${quiz.title}" is not open yet. Please check its scheduled start time.`);
      return;
    }
    setPortalNotice(null);
    proceedWithQuizStart(quiz);
  };

  const proceedWithQuizStart = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setExamPhase('instructions');
  };

  const handleVerifyGlobalPasscode = async () => {
    if (!pendingPasscodeQuiz) return;
    const entered = passcodeInput.trim();
    if (!entered) {
      setPasscodeError('Please enter the exam passcode.');
      return;
    }

    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(pendingPasscodeQuiz.id)}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ passcode: entered }),
      });

      if (res.ok) {
        const targetId = pendingPasscodeQuiz.id;
        let unlockedQuiz = pendingPasscodeQuiz;
        const refreshedQuizzes = await syncQuizzesFromMySQL();
        if (refreshedQuizzes) {
          setQuizzes(refreshedQuizzes);
          const freshMatch = refreshedQuizzes.find(q => q.id === targetId);
          if (freshMatch) {
            unlockedQuiz = freshMatch;
          }
        }
        proceedWithQuizStart(unlockedQuiz);
        setPendingPasscodeQuiz(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setPasscodeError(errData.error || 'Incorrect Passcode. Please try again.');
      }
    } catch {
      setPasscodeError('Unable to verify passcode right now. Please try again.');
    }
  };

  const handleSelectQuizById = (quizId: string) => {
    const target = quizzes.find(q => q.id === quizId);
    if (target) {
      handleSelectQuiz(target);
    }
  };

  const handleStartExam = (name: string) => {
    setCandidateName(name || currentUser?.name || 'Candidate');
    setExamPhase('running');
  };

  const handleFinishExam = (result: QuizAttemptResult) => {
    const updatedHistory = saveResult(result);
    setAttemptsHistory(updatedHistory);
    setLastResult(result);
    setExamPhase('results');
  };

  const handleRetakeExam = () => {
    if (selectedQuiz) {
      setExamPhase('instructions');
    }
  };

  const handleGoHome = () => {
    setSelectedQuiz(null);
    setLastResult(null);
    setExamPhase('catalog');
  };

  const handleCandidateLogout = () => {
    setSelectedQuiz(null);
    setLastResult(null);
    setExamPhase('catalog');
    setActiveTab('user');
  };

  const candidateVisibleQuizzes = quizzes.filter(q => {
    if (!q.isPublished) return false;
    if (q.allowedEmails && q.allowedEmails.length > 0) {
      if (!currentUser || !currentUser.email) return false;
      const lowerEmails = q.allowedEmails.map(e => e.toLowerCase());
      if (!lowerEmails.includes(currentUser.email.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const isExamRunning = activeTab === 'user' && examPhase === 'running';

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {!isExamRunning && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isAdminAuthenticated={isAdminAuthenticated}
          onAdminLogout={handleAdminLogout}
          onCandidateLogout={handleCandidateLogout}
          totalQuizzesCount={candidateVisibleQuizzes.length}
          onOpenRevisionHub={() => setShowRevisionHubModal(true)}
        />
      )}

      <main className={`flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 ${isExamRunning ? 'pt-0 pb-8' : 'pt-4 sm:pt-6 pb-10 space-y-6'}`}>
        {portalNotice && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 flex items-center justify-between gap-3">
            <span>{portalNotice}</span>
            <button
              type="button"
              onClick={() => setPortalNotice(null)}
              className="text-amber-700 hover:text-amber-950 font-semibold cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Header Ad Strip - Only visible for candidates outside live exam */}
        {activeTab !== 'admin' && !isExamRunning && (
          <HeaderAdBanner quizzes={candidateVisibleQuizzes} onSelectQuiz={handleSelectQuiz} className="w-full" containerClassName="w-full" />
        )}

        <Suspense fallback={
          <div className="text-center py-20 text-slate-500 text-xs font-mono font-bold animate-pulse">
            Loading Evalnium CBT Module...
          </div>
        }>
          {activeTab === 'admin' && isAdminAuthenticated && (!currentUser || currentUser.role === 'admin') ? (
            <AdminDashboard
              quizzes={quizzes}
              announcements={announcements}
              onSaveQuiz={handleSaveQuiz}
              onDeleteQuiz={handleDeleteQuiz}
              onTogglePublish={handleTogglePublish}
              onSaveAnnouncement={handleSaveAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onLogout={handleAdminLogout}
            />
          ) : activeTab === 'dashboard' ? (
            <CandidateDashboard
              quizzes={candidateVisibleQuizzes}
              attemptsHistory={attemptsHistory}
              onSelectQuiz={handleSelectQuiz}
              onNavigateToCatalog={() => setActiveTab('user')}
            />
          ) : activeTab === 'leaderboard' ? (
            <LeaderboardView
              quizzes={quizzes}
              attemptsHistory={attemptsHistory}
              onNavigateToCatalog={() => setActiveTab('user')}
            />
          ) : (
            <>
              {examPhase === 'catalog' && (
                <>
                  <AnnouncementBanner
                    announcements={announcements}
                    onSelectQuizById={handleSelectQuizById}
                  />

                  <TopicCatalog
                    quizzes={candidateVisibleQuizzes}
                    attemptsHistory={attemptsHistory}
                    onSelectQuiz={handleSelectQuiz}
                    onRequireAuth={() => setShowAuthModal(true)}
                  />
                </>
              )}

              {examPhase === 'instructions' && selectedQuiz && (
                <QuizInstructionsModal
                  quiz={selectedQuiz}
                  defaultCandidateName={currentUser?.name || candidateName}
                  onStartExam={handleStartExam}
                  onCancel={() => setExamPhase('catalog')}
                />
              )}

              {examPhase === 'running' && selectedQuiz && (
                <ExamRunner
                  quiz={selectedQuiz}
                  candidateName={candidateName}
                  onFinishExam={handleFinishExam}
                  onExitExam={handleGoHome}
                />
              )}

              {examPhase === 'results' && lastResult && selectedQuiz && (
                <ExamResultView
                  result={lastResult}
                  quiz={selectedQuiz}
                  onRetake={handleRetakeExam}
                  onGoHome={handleGoHome}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      {showAdminLockModal && (
        <AdminLockModal
          onUnlock={handleUnlockAdmin}
          onCancel={() => {
            setShowAdminLockModal(false);
            clearAdminUrlTrigger();
          }}
        />
      )}

      {showRevisionHubModal && (
        <Suspense fallback={null}>
          <RevisionHubModal
            isOpen={showRevisionHubModal}
            onClose={() => setShowRevisionHubModal(false)}
          />
        </Suspense>
      )}

      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={() => setShowAuthModal(false)} 
        />
      )}

      {pendingPasscodeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-rose-50 border-b border-rose-100 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xs border border-rose-200 mb-3">
                <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-900">Protected Exam</h3>
              <p className="text-xs font-semibold text-slate-600 mt-1">{pendingPasscodeQuiz.title}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase">Enter Access Passcode</label>
                <input
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    setPasscodeError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyGlobalPasscode()}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 font-mono text-center tracking-widest text-lg"
                  placeholder="••••••••"
                  autoFocus
                />
                {passcodeError && (
                  <p className="text-xs font-bold text-rose-600 text-center">{passcodeError}</p>
                )}
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setPendingPasscodeQuiz(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyGlobalPasscode}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors"
                >
                  Unlock & Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isExamRunning && activeTab !== 'admin' && (
        <HeaderAdBanner
          quizzes={candidateVisibleQuizzes}
          onSelectQuiz={handleSelectQuiz}
          slotType="footer_ad"
          className="w-full"
          containerClassName="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-6"
        />
      )}

      {!isExamRunning && (
      <footer className="bg-white border-t border-slate-200 py-6 text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Copyright */}
            <div className="text-xs text-center md:text-left text-slate-500">
              <span>© 2026 <strong className="font-semibold text-slate-700">Arshad Abdul</strong>. All Rights Reserved.</span>
            </div>

            {/* Live Activity Summary */}
            <div className="flex items-center justify-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{activeVisitorsCount || 1} active</span>
              </span>
              <span className="text-slate-300">·</span>
              <span>{totalVisitors ? totalVisitors.toLocaleString() : '1'} visits</span>
            </div>

            {/* Platform Version, Legal Links & Authenticated Admin Studio Shortcut */}
            <div className="flex flex-wrap items-center gap-2.5 text-slate-400 font-mono text-[11px] justify-center md:justify-end">
              <button
                type="button"
                onClick={() => setLegalDoc('terms')}
                className="text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
              >
                Terms
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setLegalDoc('privacy')}
                className="text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <span>·</span>
              <span>Evalnium v2.0</span>
              {isAdminAuthenticated && (!currentUser || currentUser.role === 'admin') && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className="text-slate-500 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
                  >
                    Admin Studio
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Legal Non-Affiliation Disclaimer */}
          <div className="border-t border-slate-100 pt-3 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-4xl mx-auto">
              Evalnium is an independent educational quiz and practice platform and is not affiliated with or endorsed by NTA, UGC, or any government examination authority. Examination names and trademarks belong to their respective owners and are used strictly for educational identification.
            </p>
          </div>
        </div>
      </footer>
      )}

      <ScrollToTopButton />

      {legalDoc && (
        <LegalPolicyModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
