import React, { useState, useEffect, useCallback } from 'react';
import type { Quiz, UserAnswer, QuizAttemptResult } from '../../types/quiz';
import { ChevronLeft, ChevronRight, AlertTriangle, Send, Clock, X } from 'lucide-react';
import { saveBookmarkedQuestion } from './RevisionHubModal';
import { ExamHeader } from '../exam/ExamHeader';
import { QuestionPalette } from '../exam/QuestionPalette';
import { QuestionCard } from '../exam/QuestionCard';
import { ProctoringMonitor } from '../exam/ProctoringMonitor';
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
  const sessionKey = `evalnium_live_exam_${currentUser?.email || candidateName || 'guest'}_${quiz.id}`;

  const [examStartTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime) return parsed.startTime;
      }
    } catch {}
    const now = Date.now();
    try {
      localStorage.setItem(sessionKey, JSON.stringify({ startTime: now, userAnswers: {} }));
    } catch {}
    return now;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(quiz.timeLimitMinutes * 60);
  const [questionTimeRemainingSeconds, setQuestionTimeRemainingSeconds] = useState(
    quiz.timingMode === 'question' ? (quiz.questionTimeLimitSeconds || 60) : 0
  );
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userAnswers) return parsed.userAnswers;
      }
    } catch {}
    return {};
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [languageMode, setLanguageMode] = useState<'dual' | 'en' | 'hi'>(quiz.defaultLanguageMode || 'en');
  const [examViewMode, setExamViewMode] = useState<'single' | 'all'>(quiz.questionViewMode === 'all_only' ? 'all' : 'single');
  const [sectionTimeRemainingSeconds, setSectionTimeRemainingSeconds] = useState<number>(0);
  const [sectionTransitionMsg, setSectionTransitionMsg] = useState<string | null>(null);

  const activeQuestions = React.useMemo(() => {
    let prepared = quiz.questions.map(q => {
      // Maintain strict, consistent authored alphabetical order (A, B, C, D) so numbering and answer keys never scramble
      const orderedOpts = [...(q.options || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return { ...q, options: orderedOpts };
    });

    if (quiz.shuffleQuestions && prepared.length > 0) {
      const shuffledQs = [...prepared];
      for (let i = shuffledQs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQs[i], shuffledQs[j]] = [shuffledQs[j], shuffledQs[i]];
      }
      prepared = shuffledQs;
    }

    return prepared;
  }, [quiz.id, quiz.questions, quiz.shuffleQuestions, quiz.shuffleOptions]);

  // Section boundary computation — drives per-section timer and navigation locking
  const sectionBoundaries = React.useMemo(() => {
    if (!quiz.sectionalConfig?.length || quiz.timingMode !== 'sectional') return [];
    let cursor = 0;
    const equalSize = Math.max(1, Math.floor(activeQuestions.length / quiz.sectionalConfig.length));
    return quiz.sectionalConfig.map((sec) => {
      const start = cursor;
      const count = (sec.questionIds && sec.questionIds.length > 0 ? sec.questionIds.length : sec.questionCount) || equalSize;
      cursor += count;
      return { start, end: Math.min(cursor, activeQuestions.length), section: sec };
    });
  }, [quiz.sectionalConfig, quiz.timingMode, activeQuestions.length]);

  const currentSectionIdx = React.useMemo(() =>
    !sectionBoundaries.length ? 0
    : sectionBoundaries.reduce((best, { start }, i) => currentQuestionIndex >= start ? i : best, 0)
  , [sectionBoundaries, currentQuestionIndex]);

  const currentSectionBoundary = sectionBoundaries[currentSectionIdx] ?? null;
  const isLastQuestionOfSection = !!currentSectionBoundary && currentQuestionIndex >= currentSectionBoundary.end - 1;
  const isLastSection = currentSectionIdx >= sectionBoundaries.length - 1;
  // Blocked if: sectional mode + prevent early next + no manual early move + on last Q of section + not last section + timer > 0
  const isBlockedBySectionLock =
    quiz.timingMode === 'sectional' &&
    quiz.preventEarlyNextSection === true &&
    !quiz.allowManualEarlyMove &&
    isLastQuestionOfSection &&
    !isLastSection &&
    sectionTimeRemainingSeconds > 0;

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showAntiCheatWarning, setShowAntiCheatWarning] = useState(false);

  const currentQuestion = activeQuestions[currentQuestionIndex] || activeQuestions[0];
  const currentAnswer = userAnswers[currentQuestion?.id] || {
    questionId: currentQuestion?.id,
    selectedOptionId: null,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
  };

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(sessionKey);
    } catch {}
  }, [sessionKey]);

  // Stable ref so force-submit always calls the latest calculateResults
  const calculateResultsRef = React.useRef<(() => QuizAttemptResult) | null>(null);

  // Stable ref so question-timer effect can call latest handleForceSubmit without adding it to deps
  const handleForceSubmitRef = React.useRef<(() => void) | null>(null);
  // Stable ref for activeQuestions.length so question-timer doesn't restart on quiz data changes
  const activeQuestionsCountRef = React.useRef(activeQuestions.length);
  activeQuestionsCountRef.current = activeQuestions.length;

  const handleForceSubmit = useCallback(() => {
    clearSession();
    const result = calculateResultsRef.current?.();
    if (result) onFinishExam(result);
  }, [clearSession, onFinishExam]);

  // Keep handleForceSubmitRef in sync after it's defined
  handleForceSubmitRef.current = handleForceSubmit;

  // Section advance refs — must be after sectionBoundaries memo so they capture current values
  const handleSectionAdvanceRef = React.useRef<(() => void) | null>(null);
  const sectionBoundariesRef = React.useRef(sectionBoundaries);
  sectionBoundariesRef.current = sectionBoundaries;
  const currentSectionIdxRef = React.useRef(currentSectionIdx);
  currentSectionIdxRef.current = currentSectionIdx;

  const handleSectionAdvance = useCallback(() => {
    const boundaries = sectionBoundariesRef.current;
    const curIdx = currentSectionIdxRef.current;
    if (curIdx < boundaries.length - 1) {
      const next = boundaries[curIdx + 1];
      setSectionTransitionMsg(`⏰ Section ${curIdx + 1} time over! Auto-moving to "${next.section.sectionName}"...`);
      setTimeout(() => setSectionTransitionMsg(null), 4000);
      setCurrentQuestionIndex(next.start);
    } else {
      setSectionTransitionMsg('⏰ All sections completed. Auto-submitting your exam...');
      setTimeout(() => handleForceSubmitRef.current?.(), 2000);
    }
  }, []);
  handleSectionAdvanceRef.current = handleSectionAdvance;

  useEffect(() => {
    if (!quiz.enableAntiCheating) return;
    const maxViolations = quiz.maxTabSwitches || 3;
    const originalWidth = window.innerWidth;

    const triggerViolation = () => {
      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        setShowAntiCheatWarning(true);
        if (nextCount >= maxViolations) {
          alert(`🚨 ANTI-CHEATING VIOLATION: ${maxViolations} violation${maxViolations > 1 ? 's' : ''} detected. Exam is being automatically submitted now.`);
          handleForceSubmit();
        }
        return nextCount;
      });
    };

    // Tab switch / window minimize
    const handleVisibilityChange = () => { if (document.hidden) triggerViolation(); };
    // Alt+Tab / clicking another app — only count if tab is still visible to avoid double-counting
    const handleWindowBlur = () => { if (!document.hidden) triggerViolation(); };
    // Significant resize = probable split-screen; use a flag to avoid counting every drag tick
    let resizeFired = false;
    const handleWindowResize = () => {
      if (!resizeFired && window.innerWidth < originalWidth * 0.70) {
        resizeFired = true;
        triggerViolation();
        setTimeout(() => { resizeFired = false; }, 10000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('resize', handleWindowResize);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [quiz.enableAntiCheating, quiz.maxTabSwitches, handleForceSubmit]);

  // Save progress & userAnswers to LocalStorage on state update
  useEffect(() => {
    try {
      localStorage.setItem(sessionKey, JSON.stringify({
        startTime: examStartTime,
        userAnswers,
      }));
    } catch {}
  }, [userAnswers, examStartTime, sessionKey]);

  // Real-world countdown timer (calculates accurate remaining time across logouts/reloads)
  useEffect(() => {
    const updateTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - examStartTime) / 1000);
      const totalLimitSeconds = quiz.timeLimitMinutes * 60;
      const remaining = Math.max(0, totalLimitSeconds - elapsedSeconds);
      setTimeRemainingSeconds(remaining);

      if (remaining <= 0) {
        handleForceSubmit();
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    const getApiBaseUrl = () => {
      if (typeof window !== 'undefined') {
        return '/api';
      }
      return 'http://localhost:5050/api';
    };

    const pingHeartbeat = () => {
      fetch(`${getApiBaseUrl()}/sessions/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quizId: quiz.id,
          quizTitle: quiz.title,
          candidateName,
          candidateEmail: currentUser?.email,
          timeRemaining: timeRemainingSeconds,
          percentageComplete: Math.round((Object.keys(userAnswers).length / quiz.questions.length) * 100)
        })
      }).catch(() => {}); // ignore error
    };

    pingHeartbeat();
    const heartbeatInterval = setInterval(pingHeartbeat, 10000); // every 10s

    return () => {
      clearInterval(timer);
      clearInterval(heartbeatInterval);
    };
  }, [examStartTime, quiz.timeLimitMinutes, quiz.id, candidateName, currentUser?.email, timeRemainingSeconds, userAnswers, quiz.questions.length, handleForceSubmit]);

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

  // Per-question countdown: only re-runs when the question index or timing settings change
  useEffect(() => {
    if (quiz.timingMode !== 'question') return;
    const limit = quiz.questionTimeLimitSeconds || 60;
    setQuestionTimeRemainingSeconds(limit);
    let timeLeft = limit;
    const interval = setInterval(() => {
      timeLeft -= 1;
      setQuestionTimeRemainingSeconds(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(interval);
        // Use refs so this callback is never stale even if parent re-renders
        if (currentQuestionIndex < activeQuestionsCountRef.current - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          handleForceSubmitRef.current?.();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  // handleForceSubmit and activeQuestions.length are intentionally accessed via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, quiz.timingMode, quiz.questionTimeLimitSeconds]);

  // Per-section countdown (sectional timing mode only) — resets automatically when section changes
  useEffect(() => {
    if (quiz.timingMode !== 'sectional') return;
    const secConfig = quiz.sectionalConfig?.[currentSectionIdx];
    if (!secConfig?.timeLimitMinutes) return;

    const limit = secConfig.timeLimitMinutes * 60;
    setSectionTimeRemainingSeconds(limit);
    let timeLeft = limit;

    const interval = setInterval(() => {
      timeLeft -= 1;
      setSectionTimeRemainingSeconds(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(interval);
        handleSectionAdvanceRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIdx, quiz.timingMode]);

  const handleSelectOption = useCallback((optionId: string) => {
    const qId = currentQuestion.id;
    const isMSQ = currentQuestion.questionType === 'multiple_select';

    setUserAnswers((prev) => {
      const existing = prev[qId] || {
        questionId: qId,
        selectedOptionId: null,
        selectedOptionIds: [],
        isMarkedForReview: false,
        timeSpentSeconds: 0,
      };
      if (isMSQ) {
        const current = existing.selectedOptionIds || [];
        const next = current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId].sort();
        return { ...prev, [qId]: { ...existing, selectedOptionId: null, selectedOptionIds: next } };
      }
      return { ...prev, [qId]: { ...existing, selectedOptionId: optionId, selectedOptionIds: [] } };
    });
  }, [currentQuestion?.id, currentQuestion?.questionType]);

  const handleClearChoice = (qId: string) => {
    setUserAnswers((prev) => {
      const existing = prev[qId];
      if (!existing) return prev;
      return { ...prev, [qId]: { ...existing, selectedOptionId: null, selectedOptionIds: [] } };
    });
  };

  const handleToggleMarkForReview = useCallback((qId: string) => {
    const qObj = activeQuestions.find(q => q.id === qId);
    setUserAnswers((prev) => {
      const existing = prev[qId] || {
        questionId: qId,
        selectedOptionId: null,
        isMarkedForReview: false,
        timeSpentSeconds: 0,
      };
      const nextState = !existing.isMarkedForReview;
      if (nextState && qObj) saveBookmarkedQuestion(qObj, currentUser?.uid);
      return { ...prev, [qId]: { ...existing, isMarkedForReview: nextState } };
    });
  }, [activeQuestions]);

  const calculateResults = useCallback((): QuizAttemptResult => {
    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = 0;

    activeQuestions.forEach((q) => {
      const uAns = userAnswers[q.id];
      const isMSQ = q.questionType === 'multiple_select';
      
      let isCorrect = false;
      let isSkipped = false;

      if (isMSQ) {
        const selected = uAns?.selectedOptionIds || [];
        const correct = q.correctOptionIds || [q.correctOptionId];
        isSkipped = selected.length === 0;
        
        // Exact match of arrays
        if (!isSkipped) {
          isCorrect = selected.length === correct.length && selected.every(val => correct.includes(val!));
        }
      } else {
        const selected = uAns?.selectedOptionId || null;
        isSkipped = selected === null;
        if (!isSkipped) {
          isCorrect = selected === q.correctOptionId;
        }
      }

      if (isSkipped) {
        skippedQuestions++;
      } else if (isCorrect) {
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
  }, [activeQuestions, candidateName, currentUser?.name, quiz.negativeMarks, quiz.passingPercentage, quiz.timeLimitMinutes, quiz.title, quiz.topic, quiz.id, timeRemainingSeconds, userAnswers]);

  // Keep ref in sync so handleForceSubmit always uses the latest calculateResults
  calculateResultsRef.current = calculateResults;

  const handleConfirmSubmit = useCallback(() => {
    clearSession();
    setShowSubmitModal(false);
    const result = calculateResults();
    onFinishExam(result);
  }, [calculateResults, clearSession, onFinishExam]);

  const answeredCount = Object.values(userAnswers).filter((a) => {
    if (a.selectedOptionIds && a.selectedOptionIds.length > 0) return true;
    return a.selectedOptionId !== null;
  }).length;
  const reviewCount = Object.values(userAnswers).filter(a => a.isMarkedForReview).length;

  return (
    <div className="min-h-[92vh] flex flex-col justify-between space-y-4 sm:space-y-6">
      
      {/* Exam Header */}
      <ExamHeader
        topic={quiz.topic}
        title={quiz.title}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        examViewMode={examViewMode}
        setExamViewMode={setExamViewMode}
        questionViewMode={quiz.questionViewMode}
        timingMode={quiz.timingMode}
        timeRemainingSeconds={timeRemainingSeconds}
        questionTimeRemainingSeconds={quiz.timingMode === 'question' ? questionTimeRemainingSeconds : undefined}
        sectionTimeRemainingSeconds={quiz.timingMode === 'sectional' ? sectionTimeRemainingSeconds : undefined}
        currentSectionName={quiz.timingMode === 'sectional' && quiz.sectionalConfig?.[currentSectionIdx] ? quiz.sectionalConfig[currentSectionIdx].sectionName : undefined}
        answeredCount={answeredCount}
        totalQuestions={activeQuestions.length}
        onToggleMobilePalette={() => setShowMobilePalette(true)}
        onOpenSubmitModal={() => setShowSubmitModal(true)}
      />

      {/* Live AI Proctoring Radar & Anti-Cheating Monitor */}
      <div className="flex justify-end">
        <ProctoringMonitor
          quizId={quiz.id}
          candidateName={candidateName}
          candidateEmail={currentUser?.email}
          enableCameraProctoring={quiz.enableAntiCheating !== false}
        />
      </div>

      {/* Anti-Cheating Tab Switch Warning Banner */}
      {showAntiCheatWarning && (
        <div className="bg-rose-600 text-white p-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-bounce">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-300 flex-shrink-0" />
            <span>
              ⚠️ ANTI-CHEATING WARNING ({tabSwitchCount}/{quiz.maxTabSwitches || 3}): Tab/Window switch or resize detected! Exam auto-submits after {quiz.maxTabSwitches || 3} violation{(quiz.maxTabSwitches || 3) > 1 ? 's' : ''}.
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

      {/* Section Transition Toast — shown when a section auto-expires and moves to next */}
      {sectionTransitionMsg && (
        <div className="bg-indigo-700 text-white p-3 rounded-2xl flex items-center space-x-2 text-xs font-bold shadow-xl border border-indigo-500 animate-pulse">
          <Clock className="w-4 h-4 text-yellow-300 flex-shrink-0" />
          <span>{sectionTransitionMsg}</span>
        </div>
      )}

      {/* Section Tabs Bar */}
      {quiz.timingMode === 'sectional' && quiz.sectionalConfig && quiz.sectionalConfig.length > 0 && (
        <div className="flex items-center space-x-2 bg-slate-900 text-white p-2.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 px-2 uppercase font-mono flex-shrink-0">Paper Sections:</span>
          {quiz.sectionalConfig!.map((sec, idx) => {
            const boundary = sectionBoundaries[idx];
            const firstQIndex = boundary ? Math.min(boundary.start, activeQuestions.length - 1) : 0;
            const isBackLocked = quiz.preventPreviousSectionReturn === true && idx < currentSectionIdx;
            const isForwardLocked = quiz.preventEarlyNextSection === true && !quiz.allowManualEarlyMove && idx > currentSectionIdx && sectionTimeRemainingSeconds > 0;
            const isLocked = isBackLocked || isForwardLocked;
            const isCurrent = idx === currentSectionIdx;
            // Live countdown on current section tab
            const secTimeDisplay = isCurrent && quiz.timingMode === 'sectional' && sectionTimeRemainingSeconds > 0
              ? ` ⏱ ${Math.floor(sectionTimeRemainingSeconds / 60)}:${String(sectionTimeRemainingSeconds % 60).padStart(2, '0')}`
              : ` (${sec.timeLimitMinutes}m)`;
            return (
              <button
                key={sec.id || idx}
                onClick={() => { if (!isLocked) setCurrentQuestionIndex(firstQIndex); }}
                disabled={isLocked}
                title={isForwardLocked ? 'Locked — finish current section time first' : isBackLocked ? 'Cannot return to previous sections' : undefined}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md border flex-shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-white text-indigo-900 border-white'
                    : isLocked
                    ? 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-400/40 cursor-pointer'
                }`}
              >
                {sec.sectionName}{secTimeDisplay}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Examination Layout */}
      {examViewMode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          {/* Question Box */}
          <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={activeQuestions.length}
              userAnswer={currentAnswer}
              languageMode={languageMode}
              enablePracticeMode={quiz.enablePracticeMode}
              onSelectOption={handleSelectOption}
              onClearChoice={() => handleClearChoice(currentQuestion.id)}
              onToggleBookmark={() => handleToggleMarkForReview(currentQuestion.id)}
            />

            {/* Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0 || quiz.preventPreviousQuestionReturn === true}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous (←)</span>
              </button>

              <div className="flex items-center space-x-3">
                {currentQuestionIndex < activeQuestions.length - 1 ? (
                  <button
                    onClick={() => {
                      // Section boundary navigation: at last Q of section, jump to next section start
                      if (isLastQuestionOfSection && !isLastSection && quiz.timingMode === 'sectional') {
                        if (isBlockedBySectionLock) return;
                        const nextBoundary = sectionBoundaries[currentSectionIdx + 1];
                        if (nextBoundary) setCurrentQuestionIndex(nextBoundary.start);
                      } else {
                        setCurrentQuestionIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1));
                      }
                    }}
                    disabled={
                      (quiz.timingMode === 'question' && quiz.preventEarlyNextQuestion === true && questionTimeRemainingSeconds > 0) ||
                      isBlockedBySectionLock
                    }
                    title={isBlockedBySectionLock ? `Cannot advance — wait for section timer to expire (${sectionTimeRemainingSeconds}s remaining)` : undefined}
                    className={`px-5 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1.5 transition-all ${
                      isBlockedBySectionLock
                        ? 'bg-slate-400 cursor-not-allowed text-white opacity-80'
                        : isLastQuestionOfSection && !isLastSection && quiz.timingMode === 'sectional'
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <span>
                      {isBlockedBySectionLock
                        ? `⏳ Wait (${sectionTimeRemainingSeconds}s)`
                        : isLastQuestionOfSection && !isLastSection && quiz.timingMode === 'sectional'
                        ? 'Finish Section →'
                        : 'Save & Next (➔)'}
                    </span>
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

          {/* Desktop Right Question Palette */}
          <div className="hidden lg:block">
            <QuestionPalette
              questions={activeQuestions}
              currentQuestionIndex={currentQuestionIndex}
              userAnswers={userAnswers}
              preventPreviousQuestion={quiz.preventPreviousQuestionReturn === true}
              onSelectQuestion={setCurrentQuestionIndex}
              onOpenSubmitModal={() => setShowSubmitModal(true)}
              sectionBoundaries={sectionBoundaries}
              currentSectionIdx={currentSectionIdx}
              lockToCurrentSection={
                quiz.timingMode === 'sectional' &&
                quiz.preventEarlyNextSection === true &&
                !quiz.allowManualEarlyMove &&
                sectionTimeRemainingSeconds > 0
              }
            />
          </div>

          {/* Mobile & Tablet Question Palette Slide-Over Sheet */}
          {showMobilePalette && (
            <div className="fixed inset-0 z-50 lg:hidden flex justify-end" role="dialog" aria-modal="true" aria-label="Question palette">
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                onClick={() => setShowMobilePalette(false)}
              />
              <div className="relative z-10 w-[88vw] max-w-[340px] h-full bg-white shadow-2xl flex flex-col">
                <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <span className="text-sm font-bold text-slate-900">Question Palette</span>
                  <button
                    type="button"
                    onClick={() => setShowMobilePalette(false)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    aria-label="Close question palette"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <QuestionPalette
                    questions={activeQuestions}
                    currentQuestionIndex={currentQuestionIndex}
                    userAnswers={userAnswers}
                    preventPreviousQuestion={quiz.preventPreviousQuestionReturn === true}
                    onSelectQuestion={(idx) => {
                      setCurrentQuestionIndex(idx);
                      setShowMobilePalette(false);
                    }}
                    onOpenSubmitModal={() => {
                      setShowMobilePalette(false);
                      setShowSubmitModal(true);
                    }}
                    sectionBoundaries={sectionBoundaries}
                    currentSectionIdx={currentSectionIdx}
                    lockToCurrentSection={
                      quiz.timingMode === 'sectional' &&
                      quiz.preventEarlyNextSection === true &&
                      !quiz.allowManualEarlyMove &&
                      sectionTimeRemainingSeconds > 0
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* All Questions Per Screen View */
        <div className="space-y-6">
          {activeQuestions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
              <QuestionCard
                question={q}
                questionIndex={idx}
                totalQuestions={activeQuestions.length}
                userAnswer={userAnswers[q.id] || { questionId: q.id, selectedOptionId: null, isMarkedForReview: false, timeSpentSeconds: 0 }}
                languageMode={languageMode}
                onSelectOption={(optId) => {
                  const isMSQ = q.questionType === 'multiple_select';
                  setUserAnswers((prev) => {
                    const existing = prev[q.id] || { questionId: q.id, selectedOptionId: null, selectedOptionIds: [], isMarkedForReview: false, timeSpentSeconds: 0 };
                    if (isMSQ) {
                      const current = existing.selectedOptionIds || [];
                      const next = current.includes(optId) ? current.filter(id => id !== optId) : [...current, optId].sort();
                      return { ...prev, [q.id]: { ...existing, selectedOptionId: null, selectedOptionIds: next } };
                    }
                    return { ...prev, [q.id]: { ...existing, selectedOptionId: optId, selectedOptionIds: [] } };
                  });
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
                <span className="font-bold text-slate-900">{activeQuestions.length}</span>
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
                <span className="font-bold text-rose-700">{activeQuestions.length - answeredCount}</span>
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
