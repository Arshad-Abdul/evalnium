import { useState, useEffect } from 'react';
import type { Quiz, QuizAttemptResult } from './types/quiz';
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

function MainAppContent() {
  const { isAdminAuthenticated, logoutAdmin, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'leaderboard' | 'admin'>('user');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attemptsHistory, setAttemptsHistory] = useState<QuizAttemptResult[]>([]);

  const [showAdminLockModal, setShowAdminLockModal] = useState<boolean>(false);

  // Exam Workflow State
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [examPhase, setExamPhase] = useState<'catalog' | 'instructions' | 'running' | 'results'>('catalog');
  const [candidateName, setCandidateName] = useState('Candidate');
  const [lastResult, setLastResult] = useState<QuizAttemptResult | null>(null);

  useEffect(() => {
    setQuizzes(getStoredQuizzes());
    setAttemptsHistory(getStoredResults());
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

  // Exam handlers
  const handleSelectQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setExamPhase('instructions');
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
      />

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'admin' && isAdminAuthenticated ? (
          <AdminDashboard
            quizzes={quizzes}
            onSaveQuiz={handleSaveQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onTogglePublish={handleTogglePublish}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardView />
        ) : (
          /* Candidate Exam Portal */
          <>
            {examPhase === 'catalog' && (
              <TopicCatalog
                quizzes={quizzes.filter((q) => q.isPublished)}
                attemptsHistory={attemptsHistory}
                onSelectQuiz={handleSelectQuiz}
              />
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

      {/* Global Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Copyright © 2026 <strong>Arshad Abdul</strong>. All Rights Reserved.</span>
          <span className="font-mono text-slate-400">Evalnium Assessment Platform v2.0 • Light Mode</span>
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
