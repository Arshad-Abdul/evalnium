import React, { useState } from 'react';
import { Clock, Lock, Play, AlertCircle } from 'lucide-react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { useExamCountdown } from '../../utils/countdown';

interface ExamCountdownBadgeProps {
  quiz: Quiz;
  compact?: boolean;
}

/**
 * Renders a sleek, non-cluttered live status banner on cards for upcoming or live contests.
 * For regular 24/7 practice papers with no future start date, it returns null (zero clutter).
 */
export const ExamCountdownBadge: React.FC<ExamCountdownBadgeProps> = ({ quiz, compact = false }) => {
  const isContest = quiz.quizType === 'live_contest';
  const hasScheduledStart = Boolean(quiz.scheduledStartDateTime);

  // If regular practice with no scheduled start, or admin turned off timer, don't show any badge (zero clutter)
  if (quiz.showCountdown === false || (!isContest && !hasScheduledStart)) {
    return null;
  }

  return <ExamCountdownBadgeInner quiz={quiz} compact={compact} />;
};

const ExamCountdownBadgeInner: React.FC<{ quiz: Quiz; compact?: boolean }> = ({ quiz, compact }) => {
  const [, setForceTick] = useState(0);

  const startCountdown = useExamCountdown(quiz.scheduledStartDateTime, () => {
    // Force re-render when start time hits 00:00:00
    setForceTick((v) => v + 1);
  });

  const endCountdown = useExamCountdown(quiz.scheduledEndDateTime, () => {
    // Force re-render when contest officially ends
    setForceTick((v) => v + 1);
  });

  const now = Date.now();
  const startMs = quiz.scheduledStartDateTime ? new Date(quiz.scheduledStartDateTime).getTime() : 0;
  const endMs = quiz.scheduledEndDateTime ? new Date(quiz.scheduledEndDateTime).getTime() : 0;

  // Phase 1: Upcoming Test (Start date is in the future)
  if (startMs > 0 && now < startMs && !startCountdown.isExpired) {
    return (
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-amber-50/90 border border-amber-200/80 text-amber-900 font-mono text-xs select-none shadow-2xs ${compact ? 'text-[11px] py-1' : ''
          }`}
        title={`Scheduled Start: ${new Date(quiz.scheduledStartDateTime!).toLocaleString()}`}
      >
        <div className="flex items-center gap-1.5 font-sans font-semibold text-amber-800 text-[11px] truncate">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{quiz.quizType === 'scheduled_unlock' ? 'Unlocks in:' : 'Starts in:'}</span>
        </div>
        <span className="font-bold tracking-tight tabular-nums text-amber-950 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300/60 shrink-0">
          {startCountdown.formatted}
        </span>
      </div>
    );
  }

  // Phase 2: Live Active Contest (Between start time and end time)
  if (endMs > 0 && now >= startMs && now < endMs && !endCountdown.isExpired) {
    return (
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-rose-50/90 border border-rose-200/80 text-rose-900 font-mono text-xs select-none shadow-2xs ${compact ? 'text-[11px] py-1' : ''
          }`}
        title={`Contest Closes: ${new Date(quiz.scheduledEndDateTime!).toLocaleString()}`}
      >
        <div className="flex items-center gap-1.5 font-sans font-bold text-rose-700 text-[11px] truncate">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
          </span>
          <span>LIVE NOW</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-800 shrink-0">
          <span className="font-sans text-[10px] text-rose-600">Ends in:</span>
          <span className="font-bold tracking-tight tabular-nums text-rose-950 bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-300/60">
            {endCountdown.formatted}
          </span>
        </div>
      </div>
    );
  }

  // Phase 3: Contest has ended
  if (endMs > 0 && now >= endMs) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium select-none">
        <Lock className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Contest Closed</span>
      </div>
    );
  }

  return null;
};

interface ExamCountdownActionProps {
  quiz: Quiz;
  quizAttempts: QuizAttemptResult[];
  compact?: boolean;
  currentUser: { email?: string; name?: string } | null;
  onStartExam: (quiz: Quiz) => void;
  onViewHistory: () => void;
  onRequireAuth?: () => void;
}

/**
 * Interactive Action Button for Contest and Scheduled Quizzes.
 * Smoothly morphs from a live countdown lock to an unlocked 'Enter Contest' button
 * the exact second the scheduled time arrives (Zero Page Refresh required).
 */
export const ExamCountdownAction: React.FC<ExamCountdownActionProps> = ({
  quiz,
  quizAttempts,
  compact = false,
  currentUser,
  onStartExam,
  onViewHistory,
  onRequireAuth,
}) => {
  const [, setTick] = useState(0);

  const startCountdown = useExamCountdown(quiz.scheduledStartDateTime, () => {
    // Trigger instant auto-unlock when start countdown hits 0
    setTick((t) => t + 1);
  });

  const hasAttempted = quizAttempts.length > 0;
  const isContest = quiz.quizType === 'live_contest';
  const widthClass = compact ? 'px-3.5 py-2 shrink-0 whitespace-nowrap' : 'w-full py-2.5';

  const now = Date.now();
  const startMs = quiz.scheduledStartDateTime ? new Date(quiz.scheduledStartDateTime).getTime() : 0;
  const endMs = quiz.scheduledEndDateTime ? new Date(quiz.scheduledEndDateTime).getTime() : 0;

  // 1. If contest and user already submitted: View Scorecard
  if (isContest && hasAttempted) {
    return (
      <button
        type="button"
        onClick={onViewHistory}
        className={`${compact ? 'px-3 py-2 shrink-0 whitespace-nowrap' : 'w-full py-2'} rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer`}
      >
        <Lock className="w-3.5 h-3.5 text-slate-500" />
        <span>{compact ? 'Scorecard' : 'Submitted · View Scorecard'}</span>
      </button>
    );
  }

  // 2. Upcoming test locked state (Start time is in the future)
  if (startMs > 0 && now < startMs && !startCountdown.isExpired) {
    const startDate = new Date(quiz.scheduledStartDateTime!);
    return (
      <div
        className={`${compact ? 'px-3 py-2 shrink-0 max-w-[240px]' : 'w-full py-2.5 px-3'
          } rounded-lg bg-amber-50/90 text-amber-900 border border-amber-200/90 flex items-center justify-between gap-2 text-xs font-mono select-none shadow-2xs`}
        title={`Test unlocks on ${startDate.toLocaleString()}`}
      >
        <div className="flex items-center gap-1.5 font-sans font-semibold text-amber-800 text-[11px] truncate">
          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            {compact
              ? (quiz.quizType === 'scheduled_unlock' ? 'Unlocks' : 'Starts')
              : `${quiz.quizType === 'scheduled_unlock' ? 'Unlocks' : 'Starts'} ${startDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}`}
          </span>
        </div>
        <span className="font-bold tracking-tight tabular-nums text-amber-950 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300/60 shrink-0">
          {startCountdown.formatted}
        </span>
      </div>
    );
  }

  // 3. Contest Ended state
  if (isContest && endMs > 0 && now >= endMs) {
    return (
      <div
        className={`${compact ? 'px-3 py-2 shrink-0 whitespace-nowrap' : 'w-full py-2'
          } rounded-lg bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200 flex items-center justify-center gap-1.5 text-center`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Contest Ended</span>
      </div>
    );
  }

  // 4. Contest is LIVE right now!
  if (isContest) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            onRequireAuth?.();
            return;
          }
          onStartExam(quiz);
        }}
        className={`${widthClass} rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm`}
      >
        <Play className="w-3.5 h-3.5 fill-white" />
        <span>Enter Contest</span>
      </button>
    );
  }

  // 5. Standard Practice Attempt Checks
  const attemptsExhausted = Boolean(
    quiz.maxAttempts && quiz.maxAttempts > 0 && quizAttempts.length >= quiz.maxAttempts
  );

  return (
    <button
      type="button"
      onClick={() => {
        if (!currentUser) {
          onRequireAuth?.();
          return;
        }
        onStartExam(quiz);
      }}
      disabled={attemptsExhausted}
      className={`${widthClass} rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${currentUser
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-slate-900 hover:bg-slate-800 text-white'
        }`}
    >
      {currentUser ? (
        <>
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>
            {attemptsExhausted
              ? 'Attempt Limit Reached'
              : hasAttempted
                ? 'Retake Test'
                : 'Start Test'}
          </span>
        </>
      ) : (
        <>
          <Lock className="w-3.5 h-3.5" />
          <span>Sign In to Start</span>
        </>
      )}
    </button>
  );
};

