import React from 'react';
import type { Question, UserAnswer } from '../../types/quiz';

interface QuestionPaletteProps {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, UserAnswer>;
  onSelectQuestion: (index: number) => void;
  onOpenSubmitModal: () => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  onSelectQuestion,
  onOpenSubmitModal,
}) => {
  const answeredCount = Object.values(userAnswers).filter(a => a.selectedOptionId !== null).length;
  const reviewCount = Object.values(userAnswers).filter(a => a.isMarkedForReview).length;
  const unansweredCount = questions.length - answeredCount;

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
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Review ({reviewCount})</span>
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

        {/* Grid Buttons */}
        <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
          {questions.map((q, idx) => {
            const uAns = userAnswers[q.id];
            const isAnswered = uAns && uAns.selectedOptionId !== null;
            const isReview = uAns && uAns.isMarkedForReview;
            const isCurrent = idx === currentQuestionIndex;

            let btnStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';

            if (isCurrent) {
              btnStyle = 'bg-blue-600 text-white font-bold ring-2 ring-blue-600/30';
            } else if (isReview) {
              btnStyle = 'bg-amber-500 text-white font-bold border-amber-600';
            } else if (isAnswered) {
              btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-700';
            }

            return (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(idx)}
                className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center border ${btnStyle}`}
              >
                {idx + 1}
              </button>
            );
          })}
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
