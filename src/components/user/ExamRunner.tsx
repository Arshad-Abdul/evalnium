import React, { useState, useEffect } from 'react';
import type { Quiz, UserAnswer, QuizAttemptResult, Question } from '../../types/quiz';
import { Clock, Bookmark, ChevronLeft, ChevronRight, AlertTriangle, Send, Languages, Layers, CheckCircle2, XCircle } from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';
import { saveBookmarkedQuestion } from './RevisionHubModal';

interface ExamRunnerProps {
  quiz: Quiz;
  candidateName: string;
  onFinishExam: (result: QuizAttemptResult) => void;
  onExitExam?: () => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  quiz: initialQuiz,
  candidateName,
  onFinishExam,
}) => {
  // Shuffling logic on initial load if configured
  const [quiz] = useState<Quiz>(() => {
    let qList = [...initialQuiz.questions];
    if (initialQuiz.shuffleQuestions) {
      qList = qList.sort(() => Math.random() - 0.5);
    }
    if (initialQuiz.shuffleOptions) {
      qList = qList.map(q => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5)
      }));
    }
    return { ...initialQuiz, questions: qList };
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(quiz.timeLimitMinutes * 60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Language Mode: 'dual' (both) | 'en' (english only) | 'hi' (hindi only)
  const [languageMode, setLanguageMode] = useState<'dual' | 'en' | 'hi'>('dual');

  // New View Mode: 'single' (1 question per screen) | 'all' (all questions on 1 screen)
  const [examViewMode, setExamViewMode] = useState<'single' | 'all'>('single');

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

  const handleSelectOption = (qId: string, optionId: string) => {
    const existingAns = userAnswers[qId] || {
      questionId: qId,
      selectedOptionId: null,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
    };
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
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
      const qObj = quiz.questions.find(q => q.id === qId);
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
    const negPenalty = quiz.negativeMarks || 0;

    quiz.questions.forEach((q) => {
      const uAns = userAnswers[q.id];
      if (!uAns || uAns.selectedOptionId === null) {
        skippedCount++;
      } else if (uAns.selectedOptionId === q.correctOptionId) {
        correctCount++;
        totalScore += (q.marks || 1);
      } else {
        wrongCount++;
        totalScore -= negPenalty;
      }
    });

    const totalQuestions = quiz.questions.length;
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const percentage = Math.max(0, Math.round((finalScore / totalQuestions) * 100));
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
      score: finalScore,
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

  // Helper to render question text based on active language mode
  const renderQuestionText = (q: Question) => {
    if (languageMode === 'en' && q.questionEnglish) {
      return <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{q.questionEnglish}</div>;
    }
    if (languageMode === 'hi' && q.questionHindi) {
      return <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{q.questionHindi}</div>;
    }
    if (languageMode === 'dual' && (q.questionEnglish || q.questionHindi)) {
      return (
        <div className="space-y-2">
          {q.questionEnglish && (
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mr-2">EN</span>
              {q.questionEnglish}
            </div>
          )}
          {q.questionHindi && (
            <div className="text-base sm:text-lg font-bold text-slate-800 leading-snug pt-1">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2">HI</span>
              {q.questionHindi}
            </div>
          )}
        </div>
      );
    }

    return <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug whitespace-pre-line">{q.questionText}</div>;
  };

  const answeredCount = Object.values(userAnswers).filter(a => a.selectedOptionId !== null).length;
  const reviewCount = Object.values(userAnswers).filter(a => a.isMarkedForReview).length;
  const unansweredCount = quiz.questions.length - answeredCount;
  const isLowTime = timeRemainingSeconds < 120;

  return (
    <div className="min-h-[88vh] flex flex-col justify-between space-y-6">
      
      {/* Top Sticky Controls & Timer Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs sticky top-16 z-30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {quiz.topic}
          </span>
          <h2 className="font-extrabold text-slate-900 text-base sm:text-lg line-clamp-1">
            {quiz.title}
          </h2>
        </div>

        {/* View Mode & Language Mode Switchers */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Language Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 px-2 flex items-center space-x-1">
              <Languages className="w-3.5 h-3.5 text-indigo-600" />
            </span>
            <button
              onClick={() => setLanguageMode('dual')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                languageMode === 'dual'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Show both English & Hindi"
            >
              Dual (En+Hi)
            </button>
            <button
              onClick={() => setLanguageMode('en')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                languageMode === 'en'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguageMode('hi')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                languageMode === 'hi'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Exam View Layout Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setExamViewMode('single')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
                examViewMode === 'single'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1 Question/Screen</span>
            </button>

            <button
              onClick={() => setExamViewMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
                examViewMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Questions/Screen</span>
            </button>
          </div>

          {/* Countdown Timer Display */}
          <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
            isLowTime
              ? 'bg-rose-50 border-rose-300 text-rose-700 animate-timer-warning'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-600' : 'text-amber-600'}`} />
            <span>Time Left: {formatTime(timeRemainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </div>

      {/* Main Examination Layout */}
      {examViewMode === 'single' ? (
        /* Single Question Per Screen (Classic CBT Mode) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                    Q{currentQuestionIndex + 1}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Question {currentQuestionIndex + 1} of {quiz.questions.length}
                  </span>
                  {currentAnswer.timeSpentSeconds > 120 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold animate-pulse">
                      ⚠️ Caution: 2+ mins spent on this question
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <AudioPlayerButton textToRead={currentQuestion.questionEnglish || currentQuestion.questionText} />
                  {currentAnswer.isMarkedForReview && (
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center space-x-1">
                      <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>Marked for Review</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              {renderQuestionText(currentQuestion)}

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentAnswer.selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(currentQuestion.id, option.id)}
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

              {/* Instant Practice Mode Explanation Box */}
              {quiz.enablePracticeMode && currentAnswer.selectedOptionId && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2 font-bold">
                    {currentAnswer.selectedOptionId === currentQuestion.correctOptionId ? (
                      <span className="text-emerald-700 flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Correct Choice!</span>
                      </span>
                    ) : (
                      <span className="text-rose-700 flex items-center space-x-1">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Incorrect Choice (Right Option: {currentQuestion.correctOptionId})</span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {currentQuestion.explanation || `Option (${currentQuestion.correctOptionId}) is the correct answer.`}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleClearChoice(currentQuestion.id)}
                  disabled={currentAnswer.selectedOptionId === null}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold"
                >
                  Clear Choice
                </button>

                <button
                  onClick={() => handleToggleMarkForReview(currentQuestion.id)}
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

          {/* Right Question Palette Sidebar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs font-mono text-slate-500 font-bold">{answeredCount}/{quiz.questions.length} Answered</span>
            </h3>

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
      ) : (
        /* All Questions on One Screen (Scrollable Exam Mode) */
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-800 font-semibold flex items-center justify-between">
            <span>Scrollable Exam Mode: All {quiz.questions.length} questions displayed on a single screen. Select your choices below and click Submit.</span>
            <button
              onClick={() => setExamViewMode('single')}
              className="px-3 py-1 rounded-lg bg-white text-amber-900 border border-amber-300 font-bold hover:bg-amber-100"
            >
              Switch to 1/Screen
            </button>
          </div>

          <div className="space-y-6">
            {quiz.questions.map((q, idx) => {
              const ans = userAnswers[q.id] || {
                questionId: q.id,
                selectedOptionId: null,
                isMarkedForReview: false,
                timeSpentSeconds: 0,
              };

              return (
                <div key={q.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-mono font-bold text-sm flex items-center justify-center">
                      Q{idx + 1}
                    </span>

                    <button
                      onClick={() => handleToggleMarkForReview(q.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 border ${
                        ans.isMarkedForReview ? 'bg-amber-50 border-amber-300 text-amber-800' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{ans.isMarkedForReview ? 'Marked' : 'Mark Review'}</span>
                    </button>
                  </div>

                  {renderQuestionText(q)}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {q.options.map((opt) => {
                      const isSelected = ans.selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {opt.id}
                          </span>
                          <span className="text-xs font-semibold">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quiz.enablePracticeMode && ans.selectedOptionId && (
                    <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-slate-800 font-medium">
                      <strong className="text-indigo-900">Explanation: </strong>
                      {q.explanation || `Option (${q.correctOptionId}) is the correct answer.`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 text-center">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 inline-flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Entire Exam Now</span>
            </button>
          </div>
        </div>
      )}

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
              {quiz.negativeMarks ? (
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-200">
                  <span>Negative Marking Rule:</span>
                  <span>-{quiz.negativeMarks} per wrong</span>
                </div>
              ) : null}
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
