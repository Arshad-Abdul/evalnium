import React from 'react';
import type { Question, UserAnswer } from '../../types/quiz';
import { Lock, Send, CheckCircle2, Bookmark, Circle } from 'lucide-react';

interface SectionBoundary {
  start: number;
  end: number;
  section: { sectionName: string; id?: string };
}

interface QuestionPaletteProps {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, UserAnswer>;
  preventPreviousQuestion?: boolean;
  onSelectQuestion: (index: number) => void;
  onOpenSubmitModal: () => void;
  sectionBoundaries?: SectionBoundary[];
  currentSectionIdx?: number;
  lockToCurrentSection?: boolean;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  preventPreviousQuestion = false,
  onSelectQuestion,
  onOpenSubmitModal,
  sectionBoundaries = [],
  currentSectionIdx = 0,
  lockToCurrentSection = false,
}) => {
  const isAnswered = (a: UserAnswer) =>
    a.selectedOptionId !== null || (a.selectedOptionIds != null && a.selectedOptionIds.length > 0);

  const answeredCount = Object.values(userAnswers).filter(isAnswered).length;
  const reviewCount = Object.values(userAnswers).filter(a => a.isMarkedForReview).length;
  const unansweredCount = questions.length - answeredCount;

  const hasSections = sectionBoundaries.length > 0;

  // Determine which section a question at index `idx` belongs to
  const getSectionIdx = (idx: number): number => {
    if (!hasSections) return 0;
    return sectionBoundaries.reduce((best, { start }, i) => idx >= start ? i : best, 0);
  };

  const renderQuestionButton = (q: Question, idx: number) => {
    const uAns = userAnswers[q.id];
    const isAns = uAns && (uAns.selectedOptionId !== null || (uAns.selectedOptionIds != null && uAns.selectedOptionIds.length > 0));
    const isReview = uAns && uAns.isMarkedForReview;
    const isCurrent = idx === currentQuestionIndex;
    const secIdx = getSectionIdx(idx);
    const isOutsideCurrentSection = lockToCurrentSection && secIdx !== currentSectionIdx;
    const isPrevBlocked = preventPreviousQuestion && idx < currentQuestionIndex;
    const isBlocked = isPrevBlocked || isOutsideCurrentSection;

    let btnStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300';

    if (isCurrent) {
      btnStyle = 'bg-blue-600 text-white font-bold border-blue-700 ring-2 ring-blue-500/20';
    } else if (isBlocked) {
      btnStyle = 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed';
    } else if (isReview) {
      btnStyle = 'bg-amber-500 text-slate-950 font-bold border-amber-600';
    } else if (isAns) {
      btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-700';
    }

    return (
      <button
        key={q.id}
        onClick={() => {
          if (isBlocked) return;
          onSelectQuestion(idx);
        }}
        disabled={isBlocked}
        title={isOutsideCurrentSection ? 'Locked — Complete current section first' : `Question ${idx + 1}`}
        className={`h-8 rounded font-mono text-xs font-semibold transition-colors flex items-center justify-center border ${btnStyle} relative tabular-nums`}
      >
        {idx + 1}
        {isOutsideCurrentSection && (
          <Lock className="absolute -top-1 -right-1 w-2.5 h-2.5 text-slate-400" />
        )}
      </button>
    );
  };

  return (
    <div className="portal-card p-4 sm:p-5 bg-white border border-slate-200 space-y-4 flex flex-col justify-between">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
            Question Palette Matrix
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Total: {questions.length}
          </span>
        </div>

        {/* Institutional CBT Status Legend */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            <span>Answered: {answeredCount}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
            <span>Review: {reviewCount}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 border border-slate-300 inline-block" />
            <span>Unanswered: {unansweredCount}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
            <span>Current Active</span>
          </div>
        </div>

        {/* Question Grid Matrix (Section-aware) */}
        <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
          {hasSections ? (
            sectionBoundaries.map((boundary, sIdx) => {
              const secQuestions = questions.slice(boundary.start, boundary.end);
              const isCurrentSec = sIdx === currentSectionIdx;
              return (
                <div key={boundary.section.id || sIdx} className="space-y-1.5">
                  {/* Section Title Header */}
                  <div className={`flex items-center justify-between px-1 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${isCurrentSec
                      ? 'text-blue-700 bg-blue-50 border border-blue-200'
                      : 'text-slate-500 bg-slate-50 border border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-1">
                      {isCurrentSec ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse" />
                      ) : sIdx < currentSectionIdx ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                      )}
                      <span className="truncate max-w-[120px]">{boundary.section.sectionName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      Q{boundary.start + 1}–Q{boundary.end}
                    </span>
                  </div>

                  {/* Section Question Buttons */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {secQuestions.map((q, relIdx) => {
                      const absIdx = boundary.start + relIdx;
                      return renderQuestionButton(q, absIdx);
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => renderQuestionButton(q, idx))}
            </div>
          )}
        </div>
      </div>

      {/* Examination Submission Action */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <button
          onClick={onOpenSubmitModal}
          className="w-full py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Send className="w-3.5 h-3.5 text-blue-400" />
          <span>Submit Examination Paper</span>
        </button>
        <p className="text-[10px] text-slate-400 text-center font-mono">
          Keyboard: [1-4 / A-D] Choice • [➔] Next • [M] Review
        </p>
      </div>
    </div>
  );
};
