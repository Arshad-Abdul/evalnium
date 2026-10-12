import { useState, useEffect, lazy, Suspense } from 'react';
import type { Quiz, QuizAttemptResult } from './types/quiz';
import type { Announcement } from './types/announcement';
import {
  getStoredQuizzes,
  saveQuiz,
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
import { ExamRunner } from './components/user/ExamRunner';
import { ExamResultView } from './components/user/ExamResultView';
import { ScrollToTopButton } from './components/common/ScrollToTopButton';
import { AnnouncementBanner } from './components/user/AnnouncementBanner';
import { RevisionHubModal } from './components/user/RevisionHubModal';
import { CandidateDashboard } from './components/user/CandidateDashboard';
import { HeaderAdBanner } from './components/home/HeaderAdBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy loaded heavy components for fast initial bundle load
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LeaderboardView = lazy(() => import('./components/user/LeaderboardView').then(m => ({ default: m.LeaderboardView })));

function MainAppContent() {
  const { isAdminAuthenticated, logoutAdmin, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'dashboard' | 'leaderboard' | 'admin'>('user');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attemptsHistory, setAttemptsHistory] = useState<QuizAttemptResult[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [showAdminLockModal, setShowAdminLockModal] = useState<boolean>(false);
  const [showRevisionHubModal, setShowRevisionHubModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  
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
  }, [currentUser]);

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
      const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
      await fetch(`http://${host}:5050/api/site/visit`, { method: 'POST' });
    } catch {}
  };

  const sendHeartbeat = async () => {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
      const clientId = getClientId();
      const currentPage = examPhase === 'running' 
        ? `Taking Exam: ${selectedQuiz?.title || 'CBT Assessment'}` 
        : (activeTab === 'dashboard' ? 'Candidate Dashboard' : (activeTab === 'leaderboard' ? 'Live Rankings' : (activeTab === 'admin' ? 'Admin Studio' : 'Exam Catalog')));

      const res = await fetch(`http://${host}:5050/api/site/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          name: currentUser?.name || 'Guest Candidate',
          email: currentUser?.email || null,
          role: currentUser?.role || (isAdminAuthenticated ? 'admin' : 'guest'),
          isRegistered: Boolean(currentUser),
          currentPage,
          clientCountry: 'India'
        })
      });
      if (res.ok) {
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
  }, [currentUser, isAdminAuthenticated]);

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
    if (confirm('Are you sure you want to delete this quiz?')) {
      const updated = deleteQuiz(id);
      setQuizzes(updated);
      refreshDataFromMySQL();
    }
  };

  const handleTogglePublish = (quiz: Quiz) => {
    const updatedQuiz = { ...quiz, isPublished: !quiz.isPublished };
    const updated = saveQuiz(updatedQuiz);
    setQuizzes(updated);
    refreshDataFromMySQL();
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
    if (quiz.accessCode) {
      setPendingPasscodeQuiz(quiz);
      setPasscodeInput('');
      setPasscodeError('');
      return;
    }
    proceedWithQuizStart(quiz);
  };

  const proceedWithQuizStart = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setExamPhase('instructions');
  };

  const handleVerifyGlobalPasscode = () => {
    if (!pendingPasscodeQuiz) return;
    if (passcodeInput.trim() === pendingPasscodeQuiz.accessCode) {
      proceedWithQuizStart(pendingPasscodeQuiz);
      setPendingPasscodeQuiz(null);
    } else {
      setPasscodeError('Incorrect Passcode. Please try again.');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogout={handleAdminLogout}
        onCandidateLogout={handleCandidateLogout}
        totalQuizzesCount={candidateVisibleQuizzes.length}
        onOpenRevisionHub={() => setShowRevisionHubModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-6">
        {/* Top Header Ad Strip (Admin Uploaded) - Perfectly aligned with Navbar and Hero */}
        <HeaderAdBanner quizzes={candidateVisibleQuizzes} onSelectQuiz={handleSelectQuiz} className="w-full" containerClassName="w-full" />

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
            <LeaderboardView />
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
          onCancel={() => setShowAdminLockModal(false)}
        />
      )}

      {showRevisionHubModal && (
        <RevisionHubModal
          isOpen={showRevisionHubModal}
          onClose={() => setShowRevisionHubModal(false)}
        />
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

      <footer className="bg-white border-t border-slate-200 py-6 text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Copyright Section */}
          <div className="text-xs text-center md:text-left text-slate-500">
            <span>Copyright © 2026 <strong>Arshad Abdul</strong>. All Rights Reserved.</span>
          </div>

          {/* Global Community Scale Bar */}
          <div className="flex items-center justify-center space-x-4 bg-slate-50 border border-slate-200/80 px-4 py-1.5 rounded-full text-xs shadow-2xs">
            <span className="flex items-center space-x-1.5 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{activeVisitorsCount || 1} Online</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
              <span>👁️ {totalVisitors ? totalVisitors.toLocaleString() : '1'} Visits</span>
            </span>
          </div>

          {/* Platform Version & Admin Link */}
          <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px] justify-center md:justify-end">
            <span>Evalnium Platform v2.0</span>
            {(!currentUser || currentUser.role === 'admin') && (
              <>
                <span>•</span>
                <button
                  onClick={() => {
                    if (isAdminAuthenticated) {
                      setActiveTab('admin');
                    } else {
                      setShowAdminLockModal(true);
                    }
                  }}
                  className="text-slate-400 hover:text-indigo-600 font-bold transition-colors flex items-center space-x-1"
                >
                  <span>{isAdminAuthenticated ? 'Admin Studio 🔓' : 'Admin Access 🔒'}</span>
                </button>
              </>
            )}
          </div>
          
        </div>
      </footer>

      <ScrollToTopButton />
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
