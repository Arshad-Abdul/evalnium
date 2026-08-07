import React, { useState, useEffect } from 'react';
import type { Quiz, UserAnswer, QuizAttemptResult } from '../../types/quiz';
import { Clock, Bookmark, ChevronLeft, ChevronRight, AlertTriangle, Send } from 'lucide-react';

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(quiz.timeLimitMinutes * 60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const currentAnswer = userAnswers[currentQuestion.id] || {
    questionId: currentQuestion.id,
    selectedOptionId: null,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
  };

  const handleSelectOption = (optionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAnswer,
        selectedOptionId: optionId,
      },
    }));
  };

  const handleClearChoice = () => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAnswer,
        selectedOptionId: null,
      },
    }));
  };

  const handleToggleMarkForReview = () => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAnswer,
        isMarkedForReview: !currentAnswer.isMarkedForReview,
      },
    }));
  };

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateResults = (): QuizAttemptResult => {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let totalScore = 0;

    quiz.questions.forEach((q) => {
      const uAns = userAnswers[q.id];
      if (!uAns || uAns.selectedOptionId === null) {
        skippedCount++;
      } else if (uAns.selectedOptionId === q.correctOptionId) {
        correctCount++;
        totalScore += (q.marks || 1);
      } else {
        wrongCount++;
      }
    });

    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= quiz.passingPercentage;
    const totalTimeSpentSeconds = (quiz.timeLimitMinutes * 60) - timeRemainingSeconds;

    return {
      id: `attempt_${Date.now()}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      topic: quiz.topic,
      candidateName,
      totalQuestions,
      attemptedQuestions: correctCount + wrongCount,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      skippedQuestions: skippedCount,
      score: totalScore,
      maxScore: totalQuestions,
      percentage,
      passed,
      timeSpentSeconds: totalTimeSpentSeconds,
      attemptedAt: new Date().toISOString(),
      userAnswers,
    };
  };

  const handleAutoSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const result = calculateResults();
    onFinishExam(result);
  };

  const handleManualSubmit = () => {
    setIsSubmitting(true);
    const result = calculateResults();
    onFinishExam(result);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.values(userAnswers).filter(a => a.selectedOptionId !== null).length;
  const reviewCount = Object.values(userAnswers).filter(a => a.isMarkedForReview).length;
  const unansweredCount = quiz.questions.length - answeredCount;

  const isLowTime = timeRemainingSeconds < 120;

  return (
    <div className="min-h-[88vh] flex flex-col justify-between space-y-6">
      
      {/* Top Sticky Timer Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {quiz.topic}
          </span>
          <h2 className="font-extrabold text-slate-900 text-base sm:text-lg line-clamp-1">
            {quiz.title}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Countdown Timer Display */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-all ${
            isLowTime
              ? 'bg-rose-50 border-rose-300 text-rose-700 animate-timer-warning'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Clock className={`w-4 h-4 ${isLowTime ? 'text-rose-600' : 'text-amber-600'}`} />
            <span>Time Left: {formatTime(timeRemainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </div>

      {/* Main Examination Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        
        {/* Left 3 Columns: Active Question Area */}
        <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
          
          <div className="space-y-6">
            {/* Question Index & Status Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                  Q{currentQuestionIndex + 1}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
              </div>

              {currentAnswer.isMarkedForReview && (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center space-x-1">
                  <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Marked for Review</span>
                </span>
              )}
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug whitespace-pre-line">
              {currentQuestion.questionText}
            </div>

            {/* Options List Cards */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswer.selectedOptionId === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start space-x-4 transition-all duration-150 ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {option.id}
                    </div>

                    <div className="flex-1 text-sm font-semibold pt-1">
                      {option.text}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClearChoice}
                disabled={currentAnswer.selectedOptionId === null}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold"
              >
                Clear Choice
              </button>

              <button
                onClick={handleToggleMarkForReview}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  currentAnswer.isMarkedForReview
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${currentAnswer.isMarkedForReview ? 'fill-amber-600 text-amber-600' : ''}`} />
                <span>{currentAnswer.isMarkedForReview ? 'Unmark Review' : 'Mark for Review'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleSaveAndNext}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold flex items-center space-x-1 shadow-xs"
              >
                <span>Save & Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Question Palette Sidebar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Question Palette</span>
            <span className="text-xs font-mono text-slate-500 font-bold">{answeredCount}/{quiz.questions.length} Answered</span>
          </h3>

          {/* Palette Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Review ({reviewCount})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              <span>Current</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span>Skipped ({unansweredCount})</span>
            </div>
          </div>

          {/* Palette Grid Buttons */}
          <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
            {quiz.questions.map((q, idx) => {
              const ans = userAnswers[q.id];
              const isCurrent = currentQuestionIndex === idx;
              const isAnswered = ans && ans.selectedOptionId !== null;
              const isReview = ans && ans.isMarkedForReview;

              let btnStyle = 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200';

              if (isCurrent) {
                btnStyle = 'bg-indigo-600 border-indigo-700 text-white font-bold ring-2 ring-indigo-300 scale-105';
              } else if (isReview) {
                btnStyle = 'bg-amber-500 border-amber-600 text-white font-bold';
              } else if (isAnswered) {
                btnStyle = 'bg-emerald-600 border-emerald-700 text-white font-bold';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-full aspect-square rounded-xl text-xs font-mono border flex items-center justify-center transition-all ${btnStyle}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Final Test Submission</span>
            </button>
          </div>
        </div>

      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl border border-slate-200 space-y-6 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Final Submission</h3>
                <p className="text-xs text-slate-500">Are you sure you want to finish this examination?</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs font-medium">
              <div className="flex justify-between text-slate-700">
                <span>Total Questions:</span>
                <span className="font-mono font-bold text-slate-900">{quiz.questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Attempted / Answered:</span>
                <span className="font-mono font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Marked for Review:</span>
                <span className="font-mono font-bold">{reviewCount}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Skipped / Unanswered:</span>
                <span className="font-mono font-bold">{unansweredCount}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
              >
                Resume Exam
              </button>
              <button
                onClick={handleManualSubmit}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit & View Results</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
