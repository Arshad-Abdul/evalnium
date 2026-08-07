import { useState, useEffect } from 'react';
import type { Quiz, QuizAttemptResult } from './types/quiz';
import { getStoredQuizzes, saveQuiz, deleteQuiz, resetQuizzesToDefault, getStoredResults, saveResult } from './utils/storage';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLockModal } from './components/admin/AdminLockModal';
import { TopicCatalog } from './components/user/TopicCatalog';
import { QuizInstructionsModal } from './components/user/QuizInstructionsModal';
import { ExamRunner } from './components/user/ExamRunner';
import { ExamResultView } from './components/user/ExamResultView';

export function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attemptsHistory, setAttemptsHistory] = useState<QuizAttemptResult[]>([]);

  // Admin Auth Protection State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('lis_admin_authenticated') === 'true';
  });
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

  const handleTabChange = (tab: 'user' | 'admin') => {
    if (tab === 'admin') {
      if (!isAdminAuthenticated) {
        setShowAdminLockModal(true);
      } else {
        setActiveTab('admin');
      }
    } else {
      setActiveTab('user');
    }
  };

  const handleUnlockAdmin = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('lis_admin_authenticated', 'true');
    setShowAdminLockModal(false);
    setActiveTab('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('lis_admin_authenticated');
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

  const handleResetData = () => {
    if (confirm('Reset to default pre-loaded topic quizzes? (Custom quizzes will be reset)')) {
      const reset = resetQuizzesToDefault();
      setQuizzes(reset);
      setExamPhase('catalog');
      setSelectedQuiz(null);
    }
  };

  // Exam handlers
  const handleSelectQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setExamPhase('instructions');
  };

  const handleStartExam = (name: string) => {
    setCandidateName(name);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogout={handleAdminLogout}
        totalQuizzesCount={quizzes.filter(q => q.isPublished).length}
        onResetData={handleResetData}
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
        ) : (
          /* User Exam Portal */
          <>
            {examPhase === 'catalog' && (
              <TopicCatalog
                quizzes={quizzes}
                attemptsHistory={attemptsHistory}
                onSelectQuiz={handleSelectQuiz}
              />
            )}

            {examPhase === 'instructions' && selectedQuiz && (
              <QuizInstructionsModal
                quiz={selectedQuiz}
                onCancel={handleGoHome}
                onStartExam={handleStartExam}
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

      {/* Admin Passcode Protection Modal */}
      {showAdminLockModal && (
        <AdminLockModal
          onUnlock={handleUnlockAdmin}
          onCancel={() => setShowAdminLockModal(false)}
        />
      )}

      {/* Sleek Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 LIS Quiz & Exam Studio • Multi-Format MCQ Importer & CBT Simulator</p>
          <div className="flex items-center space-x-4">
            <span className="hover:text-slate-400 cursor-pointer" onClick={() => setActiveTab('user')}>Candidate Portal</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer" onClick={() => handleTabChange('admin')}>Admin Studio</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
