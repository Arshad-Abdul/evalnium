import { useState, useEffect } from 'react';
import type { Quiz, QuizAttemptResult } from './types/quiz';
import type { Announcement } from './types/announcement';
import { getStoredQuizzes, saveQuiz, deleteQuiz, getStoredResults, saveResult } from './utils/storage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLockModal } from './components/admin/AdminLockModal';
import { LeaderboardView } from './components/user/LeaderboardView';
import { TopicCatalog } from './components/user/TopicCatalog';
import { QuizInstructionsModal } from './components/user/QuizInstructionsModal';
import { ExamRunner } from './components/user/ExamRunner';
import { ExamResultView } from './components/user/ExamResultView';
import { AnnouncementBanner } from './components/user/AnnouncementBanner';
import { RevisionHubModal } from './components/user/RevisionHubModal';

const ANNOUNCEMENTS_KEY = 'evalnium_announcements_v1';

function getStoredAnnouncements(): Announcement[] {
  try {
    const data = localStorage.getItem(ANNOUNCEMENTS_KEY);
    return data ? JSON.parse(data) : [
      {
        id: 'ann_default_1',
        title: 'UGC NET 2026 Bilingual Mock Series Live Now!',
        message: 'Practice 100+ LIS metric science questions with negative marking & instant explanations.',
        scheduledDateTime: new Date().toISOString(),
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  } catch {
    return [];
  }
}

function MainAppContent() {
  const { isAdminAuthenticated, logoutAdmin, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'leaderboard' | 'admin'>('user');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attemptsHistory, setAttemptsHistory] = useState<QuizAttemptResult[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [showAdminLockModal, setShowAdminLockModal] = useState<boolean>(false);
  const [showRevisionHubModal, setShowRevisionHubModal] = useState<boolean>(false);

  // Exam Workflow State
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [examPhase, setExamPhase] = useState<'catalog' | 'instructions' | 'running' | 'results'>('catalog');
  const [candidateName, setCandidateName] = useState('Candidate');
  const [lastResult, setLastResult] = useState<QuizAttemptResult | null>(null);

  useEffect(() => {
    setQuizzes(getStoredQuizzes());
    setAttemptsHistory(getStoredResults());
    setAnnouncements(getStoredAnnouncements());
  }, []);

  useEffect(() => {
    if (currentUser?.name) {
      setCandidateName(currentUser.name);
    }
  }, [currentUser]);

  const handleTabChange = (tab: 'user' | 'leaderboard' | 'admin') => {
    if (tab === 'admin') {
      if (!isAdminAuthenticated) {
        setShowAdminLockModal(true);
      } else {
        setActiveTab('admin');
      }
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
  };

  const handleDeleteQuiz = (id: string) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      const updated = deleteQuiz(id);
      setQuizzes(updated);
    }
  };

  const handleTogglePublish = (quiz: Quiz) => {
    const updatedQuiz = { ...quiz, isPublished: !quiz.isPublished };
    const updated = saveQuiz(updatedQuiz);
    setQuizzes(updated);
  };

  const handleSaveAnnouncement = (ann: Announcement) => {
    const updated = [ann, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updated));
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updated));
  };

  // Exam handlers
  const handleSelectQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setExamPhase('instructions');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogout={handleAdminLogout}
        totalQuizzesCount={quizzes.filter(q => q.isPublished).length}
        onOpenRevisionHub={() => setShowRevisionHubModal(true)}
      />

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'admin' && isAdminAuthenticated ? (
          <AdminDashboard
            quizzes={quizzes}
            announcements={announcements}
            onSaveQuiz={handleSaveQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onTogglePublish={handleTogglePublish}
            onSaveAnnouncement={handleSaveAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardView />
        ) : (
          /* Candidate Exam Portal */
          <>
            {examPhase === 'catalog' && (
              <>
                <AnnouncementBanner
                  announcements={announcements}
                  onSelectQuizById={handleSelectQuizById}
                />

                <TopicCatalog
                  quizzes={quizzes.filter((q) => q.isPublished)}
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
      </main>

      {/* Protected Admin Passcode Modal */}
      {showAdminLockModal && (
        <AdminLockModal
          onUnlock={handleUnlockAdmin}
          onCancel={() => setShowAdminLockModal(false)}
        />
      )}

      {/* Revision Hub Modal */}
      <RevisionHubModal
        isOpen={showRevisionHubModal}
        onClose={() => setShowRevisionHubModal(false)}
      />

      {/* Global Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Copyright © 2026 <strong>Arshad Abdul</strong>. All Rights Reserved.</span>
          <div className="flex items-center space-x-3 text-slate-400 font-mono">
            <span>Evalnium Assessment Platform v2.0</span>
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
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
