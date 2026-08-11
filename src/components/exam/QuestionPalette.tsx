import React from 'react';
import type { Question, UserAnswer } from '../../types/quiz';
import { Lock } from 'lucide-react';

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

    let btnStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
    if (isCurrent) {
      btnStyle = 'bg-blue-600 text-white font-bold ring-2 ring-blue-600/30';
    } else if (isBlocked) {
      btnStyle = 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed';
    } else if (isReview) {
      btnStyle = 'bg-purple-600 text-white font-bold border-purple-700 shadow-xs shadow-purple-600/30';
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
        title={isOutsideCurrentSection ? 'Locked — complete current section first' : undefined}
        className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center border ${btnStyle} relative`}
      >
        {idx + 1}
        {isOutsideCurrentSection && (
          <Lock className="absolute -top-1 -right-1 w-2.5 h-2.5 text-slate-400" />
        )}
      </button>
    );
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
          Question Palette Navigation
        </h3>

        {/* Legend Row */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Answered ({answeredCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
            <span>Marked Review ({reviewCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
            <span>Unanswered ({unansweredCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            <span>Active</span>
          </div>
        </div>

        {/* Question Grid — section-aware */}
        <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
          {hasSections ? (
            sectionBoundaries.map((boundary, sIdx) => {
              const secQuestions = questions.slice(boundary.start, boundary.end);
              const isCurrentSec = sIdx === currentSectionIdx;
              return (
                <div key={boundary.section.id || sIdx}>
                  {/* Section Header */}
                  <div className={`flex items-center space-x-1.5 mb-1.5 px-1 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                    isCurrentSec
                      ? 'text-indigo-700'
                      : sIdx < currentSectionIdx
                      ? 'text-slate-400'
                      : 'text-slate-400'
                  }`}>
                    {isCurrentSec ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
                    ) : sIdx < currentSectionIdx ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    ) : (
                      <Lock className="w-2.5 h-2.5" />
                    )}
                    <span>{boundary.section.sectionName}</span>
                    <span className="font-mono text-[9px] text-slate-400">
                      Q{boundary.start + 1}–Q{boundary.end}
                    </span>
                  </div>
                  {/* Question buttons for this section */}
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
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => renderQuestionButton(q, idx))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 space-y-2">
        <button
          onClick={onOpenSubmitModal}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
        >
          Submit Full Exam Paper
        </button>
        <p className="text-[10px] text-slate-400 text-center font-mono">
          Shortcuts: [1-4 / A-D] Choice • [➔] Next • [M] Bookmark
        </p>
      </div>
    </div>
  );
};
