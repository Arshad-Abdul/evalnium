import React, { useState, useEffect } from 'react';
import type { Quiz, UserAnswer, QuizAttemptResult } from '../../types/quiz';
import { ChevronLeft, ChevronRight, AlertTriangle, Send } from 'lucide-react';
import { saveBookmarkedQuestion } from './RevisionHubModal';
import { ExamHeader } from '../exam/ExamHeader';
import { QuestionPalette } from '../exam/QuestionPalette';
import { QuestionCard } from '../exam/QuestionCard';
import { useAuth } from '../../context/AuthContext';

interface ExamRunnerProps {
  quiz: Quiz;
  candidateName: string;
  onFinishExam: (result: QuizAttemptResult) => void;
  onExitExam?: () => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  quiz,
  candidateName,
  onFinishExam,
}) => {
  const { currentUser } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(quiz.timeLimitMinutes * 60);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [languageMode, setLanguageMode] = useState<'dual' | 'en' | 'hi'>('dual');
  const [examViewMode, setExamViewMode] = useState<'single' | 'all'>('single');

  const [activeQuestions] = useState(() => {
    let prepared = quiz.questions.map(q => {
      if (quiz.shuffleOptions && q.options.length > 0) {
        return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) };
      }
      return q;
    });

    if (quiz.shuffleQuestions && prepared.length > 0) {
      prepared = [...prepared].sort(() => Math.random() - 0.5);
    }

    return prepared;
  });

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showAntiCheatWarning, setShowAntiCheatWarning] = useState(false);

  const currentQuestion = activeQuestions[currentQuestionIndex] || activeQuestions[0];
  const currentAnswer = userAnswers[currentQuestion?.id] || {
    questionId: currentQuestion?.id,
    selectedOptionId: null,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
  };

  // Anti-cheating tab switch listener
  useEffect(() => {
    if (!quiz.enableAntiCheating) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const nextCount = prev + 1;
          setShowAntiCheatWarning(true);
          if (nextCount >= 3) {
            alert('🚨 ANTI-CHEATING VIOLATION: 3 Tab Switch violations detected. Exam is being automatically submitted now.');
            handleForceSubmit();
          }
          return nextCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [quiz.enableAntiCheating]);

  // Main countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleForceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Per-question timer
  useEffect(() => {
    const qTimer = setInterval(() => {
      setUserAnswers((prev) => {
        const existing = prev[currentQuestion.id] || {
          questionId: currentQuestion.id,
          selectedOptionId: null,
          isMarkedForReview: false,
          timeSpentSeconds: 0,
        };
        return {
          ...prev,
          [currentQuestion.id]: {
            ...existing,
            timeSpentSeconds: existing.timeSpentSeconds + 1,
          },
        };
      });
    }, 1000);

    return () => clearInterval(qTimer);
  }, [currentQuestion.id]);

  // Fast CBT Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keys if user is typing in an input field
      const activeElem = document.activeElement;
      if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      if (key === 'a' || code === 'Digit1' || code === 'Numpad1') {
        handleSelectOption('A');
      } else if (key === 'b' || code === 'Digit2' || code === 'Numpad2') {
        handleSelectOption('B');
      } else if (key === 'c' || code === 'Digit3' || code === 'Numpad3') {
        handleSelectOption('C');
      } else if (key === 'd' || code === 'Digit4' || code === 'Numpad4') {
        handleSelectOption('D');
      } else if (code === 'ArrowRight' || key === 'enter') {
        if (currentQuestionIndex < quiz.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else if (code === 'ArrowLeft') {
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex((prev) => prev - 1);
        }
      } else if (key === 'm') {
        handleToggleMarkForReview(currentQuestion.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, currentQuestion.id, quiz.questions.length]);

  const handleSelectOption = (optionId: string) => {
    const existingAns = userAnswers[currentQuestion.id] || {
      questionId: currentQuestion.id,
      selectedOptionId: null,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
    };
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...existingAns,
        selectedOptionId: optionId,
      },
    }));
  };

  const handleClearChoice = (qId: string) => {
    const existingAns = userAnswers[qId];
    if (!existingAns) return;
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...existingAns,
        selectedOptionId: null,
      },
    }));
  };

  const handleToggleMarkForReview = (qId: string) => {
    const existingAns = userAnswers[qId] || {
      questionId: qId,
      selectedOptionId: null,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
    };
    const nextState = !existingAns.isMarkedForReview;
    if (nextState) {
      const qObj = activeQuestions.find(q => q.id === qId);
      if (qObj) saveBookmarkedQuestion(qObj);
    }
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...existingAns,
        isMarkedForReview: nextState,
      },
    }));
  };

  const calculateResults = (): QuizAttemptResult => {
    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = 0;

    activeQuestions.forEach((q) => {
      const uAns = userAnswers[q.id];
      const selectedOpt = uAns ? uAns.selectedOptionId : null;

      if (selectedOpt === null) {
        skippedQuestions++;
      } else if (selectedOpt === q.correctOptionId) {
        score += q.marks || 1;
        correctAnswers++;
      } else {
        wrongAnswers++;
        if (quiz.negativeMarks) {
          score -= quiz.negativeMarks;
        }
      }
    });

    const finalScore = Math.max(0, Math.round(score * 100) / 100);
    const maxScore = activeQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
    const percentage = Math.round((finalScore / maxScore) * 100);
    const passed = percentage >= quiz.passingPercentage;
    const timeSpentSeconds = quiz.timeLimitMinutes * 60 - timeRemainingSeconds;

    return {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      candidateName: candidateName || currentUser?.name || 'Candidate',
      candidateEmail: currentUser?.email,
      topic: quiz.topic,
      score: finalScore,
      maxScore,
      percentage,
      passed,
      timeSpentSeconds,
      attemptedAt: new Date().toISOString(),
      userAnswers,
      correctAnswers,
      wrongAnswers,
      skippedQuestions,
      totalQuestions: activeQuestions.length,
      attemptedQuestions: correctAnswers + wrongAnswers,
    };
  };

  const handleForceSubmit = () => {
    const result = calculateResults();
    onFinishExam(result);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    const result = calculateResults();
    onFinishExam(result);
  };

  const answeredCount = Object.values(userAnswers).filter(a => a.selectedOptionId !== null).length;
  const reviewCount = Object.values(userAnswers).filter(a => a.isMarkedForReview).length;

  return (
    <div className="min-h-[88vh] flex flex-col justify-between space-y-6">
      
      {/* Exam Header */}
      <ExamHeader
        topic={quiz.topic}
        title={quiz.title}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        examViewMode={examViewMode}
        setExamViewMode={setExamViewMode}
        timeRemainingSeconds={timeRemainingSeconds}
        onOpenSubmitModal={() => setShowSubmitModal(true)}
      />

      {/* Anti-Cheating Tab Switch Warning Banner */}
      {showAntiCheatWarning && (
        <div className="bg-rose-600 text-white p-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-bounce">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-300 flex-shrink-0" />
            <span>
              ⚠️ ANTI-CHEATING WARNING ({tabSwitchCount}/3): Tab/Window switch detected! Exam will auto-submit after 3 violations.
            </span>
          </div>
          <button
            onClick={() => setShowAntiCheatWarning(false)}
            className="px-2.5 py-1 rounded bg-white text-rose-800 text-[11px] font-extrabold uppercase cursor-pointer"
          >
            I Understand
          </button>
        </div>
      )}

      {/* Section Tabs Bar */}
      {quiz.sectionalConfig && quiz.sectionalConfig.length > 0 && (
        <div className="flex items-center space-x-2 bg-slate-900 text-white p-2.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 px-2 uppercase font-mono flex-shrink-0">Paper Sections:</span>
          {quiz.sectionalConfig.map((sec, idx) => (
            <button
              key={sec.id || idx}
              onClick={() => {
                const firstQIndex = idx * Math.floor(activeQuestions.length / quiz.sectionalConfig!.length);
                setCurrentQuestionIndex(Math.min(firstQIndex, activeQuestions.length - 1));
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md border border-indigo-400/40 flex-shrink-0 cursor-pointer"
            >
              {sec.sectionName} ({sec.timeLimitMinutes} Mins)
            </button>
          ))}
        </div>
      )}

      {/* Main Examination Layout */}
      {examViewMode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          {/* Question Box */}
          <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <QuestionCard
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={activeQuestions.length}
              userAnswer={currentAnswer}
              languageMode={languageMode}
              onSelectOption={handleSelectOption}
              onClearChoice={() => handleClearChoice(currentQuestion.id)}
              onToggleBookmark={() => handleToggleMarkForReview(currentQuestion.id)}
            />

            {/* Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous (←)</span>
              </button>

              <div className="flex items-center space-x-3">
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5 transition-all"
                  >
                    <span>Save & Next (➔)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Exam</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Question Palette */}
          <QuestionPalette
            questions={quiz.questions}
            currentQuestionIndex={currentQuestionIndex}
            userAnswers={userAnswers}
            onSelectQuestion={setCurrentQuestionIndex}
            onOpenSubmitModal={() => setShowSubmitModal(true)}
          />
        </div>
      ) : (
        /* All Questions Per Screen View */
        <div className="space-y-6">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
              <QuestionCard
                question={q}
                questionIndex={idx}
                totalQuestions={quiz.questions.length}
                userAnswer={userAnswers[q.id] || { questionId: q.id, selectedOptionId: null, isMarkedForReview: false, timeSpentSeconds: 0 }}
                languageMode={languageMode}
                onSelectOption={(optId) => {
                  const existingAns = userAnswers[q.id] || { questionId: q.id, selectedOptionId: null, isMarkedForReview: false, timeSpentSeconds: 0 };
                  setUserAnswers(prev => ({ ...prev, [q.id]: { ...existingAns, selectedOptionId: optId } }));
                }}
                onClearChoice={() => handleClearChoice(q.id)}
                onToggleBookmark={() => handleToggleMarkForReview(q.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Confirm Exam Submission?</h3>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold text-slate-900">{quiz.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-bold text-emerald-700">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Marked for Review:</span>
                <span className="font-bold text-amber-700">{reviewCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Unanswered / Skipped:</span>
                <span className="font-bold text-rose-700">{quiz.questions.length - answeredCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Are you sure you want to submit? Your answers will be graded immediately.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Continue Test
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Submit Exam Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
