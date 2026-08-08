import React from 'react';
import type { Question, UserAnswer } from '../../types/quiz';
import { Bookmark } from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  userAnswer: UserAnswer;
  languageMode: 'dual' | 'en' | 'hi';
  onSelectOption: (optionId: string) => void;
  onClearChoice: () => void;
  onToggleBookmark: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  totalQuestions,
  userAnswer,
  languageMode,
  onSelectOption,
  onClearChoice,
  onToggleBookmark,
}) => {
  const selectedOptionId = userAnswer?.selectedOptionId || null;
  const isMarked = userAnswer?.isMarkedForReview || false;
  const timeSpent = userAnswer?.timeSpentSeconds || 0;

  const renderQuestionText = () => {
    if (languageMode === 'en' && question.questionEnglish) {
      return <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{question.questionEnglish}</div>;
    }
    if (languageMode === 'hi' && question.questionHindi) {
      return <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{question.questionHindi}</div>;
    }
    if (languageMode === 'dual' && (question.questionEnglish || question.questionHindi)) {
      return (
        <div className="space-y-2">
          {question.questionEnglish && (
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-2">EN</span>
              {question.questionEnglish}
            </div>
          )}
          {question.questionHindi && (
            <div className="text-base sm:text-lg font-bold text-slate-800 leading-snug pt-1">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2">HI</span>
              {question.questionHindi}
            </div>
          )}
        </div>
      );
    }

    return <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug whitespace-pre-line">{question.questionText}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Top Meta Strip */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
            Q{questionIndex + 1}
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          {timeSpent > 120 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold animate-pulse">
              ⚠️ Caution: 2+ mins spent on this question
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <AudioPlayerButton textToRead={question.questionEnglish || question.questionText} />
          {isMarked && (
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center space-x-1">
              <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Marked for Review</span>
            </span>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div>{renderQuestionText()}</div>

      {/* Options Choices Grid */}
      <div className="grid grid-cols-1 gap-3 pt-2">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => onSelectOption(opt.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-600 text-blue-950 font-bold shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {opt.id}
                </span>
                <span className="text-sm font-semibold">{opt.text}</span>
              </div>

              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear & Bookmark Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          onClick={onClearChoice}
          disabled={!selectedOptionId}
          className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40 font-semibold"
        >
          Clear Choice Selection
        </button>

        <button
          onClick={onToggleBookmark}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition-all ${
            isMarked
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-white' : ''}`} />
          <span>{isMarked ? 'Bookmarked for Review' : 'Mark for Review'}</span>
        </button>
      </div>
    </div>
  );
};
