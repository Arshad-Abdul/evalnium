import React, { useState, useEffect } from 'react';
import type { Question, UserAnswer } from '../../types/quiz';
import { translateToHindi } from '../../utils/translator';
import { Bookmark, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  userAnswer: UserAnswer;
  languageMode: 'dual' | 'en' | 'hi';
  enablePracticeMode?: boolean;
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
  enablePracticeMode,
  onSelectOption,
  onClearChoice,
  onToggleBookmark,
}) => {
  const selectedOptionId = userAnswer?.selectedOptionId || null;
  const selectedOptionIds = userAnswer?.selectedOptionIds || [];
  const isMarked = userAnswer?.isMarkedForReview || false;
  const timeSpent = userAnswer?.timeSpentSeconds || 0;
  const hasSelection = Boolean(selectedOptionId || selectedOptionIds.length > 0);

  const [autoHindiText, setAutoHindiText] = useState<string>('');
  const [autoHindiOptions, setAutoHindiOptions] = useState<Record<string, string>>({});
  const [autoHindiListI, setAutoHindiListI] = useState<string[]>([]);
  const [autoHindiListII, setAutoHindiListII] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (languageMode === 'hi' || languageMode === 'dual') {
      const srcText = question.questionEnglish || question.questionText;
      if (srcText && !question.questionHindi) {
        translateToHindi(srcText).then((res) => {
          if (isMounted && res) setAutoHindiText(res);
        });
      }

      question.options.forEach((opt) => {
        if (opt.text && opt.text.trim()) {
          translateToHindi(opt.text).then((translated) => {
            if (isMounted && translated) {
              setAutoHindiOptions((prev) => ({ ...prev, [opt.id]: translated }));
            }
          });
        }
      });

      if (question.listI && question.listI.length > 0) {
        Promise.all(question.listI.map(item => item ? translateToHindi(item) : Promise.resolve(''))).then((resList) => {
          if (isMounted && resList.some(Boolean)) {
            setAutoHindiListI(resList);
          }
        });
      }

      if (question.listII && question.listII.length > 0) {
        Promise.all(question.listII.map(item => item ? translateToHindi(item) : Promise.resolve(''))).then((resList) => {
          if (isMounted && resList.some(Boolean)) {
            setAutoHindiListII(resList);
          }
        });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [question.id, question.questionHindi, question.questionEnglish, question.questionText, question.options, question.listI, question.listII, languageMode]);

  const isMultiSelect = question.questionType === 'multiple_select';
  const correctOptionIds = question.correctOptionIds || [question.correctOptionId];
  const isSelectionCorrect = isMultiSelect
    ? selectedOptionIds.length > 0 && selectedOptionIds.length === correctOptionIds.length && selectedOptionIds.every((id) => correctOptionIds.includes(id))
    : selectedOptionId === question.correctOptionId;

  const renderQuestionText = () => {
    const englishQ = question.questionEnglish || question.questionText;
    const hindiQ = question.questionHindi || autoHindiText;

    if (languageMode === 'en') {
      return (
        <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
          {englishQ}
        </div>
      );
    }
    if (languageMode === 'hi') {
      return (
        <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
          {hindiQ || englishQ}
        </div>
      );
    }
    if (languageMode === 'dual') {
      return (
        <div className="space-y-3">
          <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-2 align-middle">
              ENGLISH
            </span>
            <span>{englishQ}</span>
          </div>
          <div className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed pt-2 border-t border-slate-100">
            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2 align-middle">
              हिन्दी
            </span>
            <span>{hindiQ || 'हिन्दी रूपान्तरण लोड हो रहा है...'}</span>
          </div>
        </div>
      );
    }

    return <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">{englishQ}</div>;
  };

  return (
    <div className="portal-card p-5 sm:p-6 bg-white border border-slate-200 space-y-5">

      {/* Top Question Status Strip */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <span className="px-2 py-1 rounded bg-slate-900 text-white font-mono font-bold text-xs">
            Q.{questionIndex + 1}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            of {totalQuestions} Questions
          </span>
          {timeSpent > 120 && (
            <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-mono">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>{Math.floor(timeSpent / 60)}m spent</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <AudioPlayerButton textToRead={question.questionEnglish || question.questionText} />
          {isMarked && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold flex items-center space-x-1">
              <Bookmark className="w-3 h-3 fill-amber-700 text-amber-700" />
              <span>Marked for Review</span>
            </span>
          )}
        </div>
      </div>

      {/* Question Statement Content */}
      <div className="py-1">
        {renderQuestionText()}
      </div>

      {/* Question Diagram / Image */}
      {question.imageUrl && (
        <div className="my-2 rounded border border-slate-200 bg-slate-50 p-2 max-w-lg">
          <img src={question.imageUrl} alt="Question Diagram" className="w-full object-contain max-h-72 rounded" />
        </div>
      )}

      {/* Match the Following List I vs List II Box */}
      {question.questionType === 'match_following' && (question.listI || question.listII) && (
        <div className="my-3 p-3.5 rounded bg-slate-50 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {question.listI && question.listI.some(Boolean) && (
              <div className="space-y-1.5">
                <span className="text-slate-800 font-bold block border-b border-slate-200 pb-1 font-mono uppercase">
                  List I (Items)
                </span>
                {question.listI.map((item, idx) => {
                  if (!item) return null;
                  const hindiItem = autoHindiListI[idx];
                  return (
                    <div key={idx} className="p-2 rounded bg-white border border-slate-200 font-medium text-slate-800">
                      {languageMode === 'en' && item}
                      {languageMode === 'hi' && (hindiItem || item)}
                      {languageMode === 'dual' && (
                        <div className="space-y-0.5">
                          <div>{item}</div>
                          {hindiItem && hindiItem !== item && (
                            <div className="text-[11px] text-slate-500 font-normal">{hindiItem}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {question.listII && question.listII.some(Boolean) && (
              <div className="space-y-1.5">
                <span className="text-slate-800 font-bold block border-b border-slate-200 pb-1 font-mono uppercase">
                  List II (Matches)
                </span>
                {question.listII.map((item, idx) => {
                  if (!item) return null;
                  const hindiItem = autoHindiListII[idx];
                  return (
                    <div key={idx} className="p-2 rounded bg-white border border-slate-200 font-medium text-slate-800">
                      {languageMode === 'en' && item}
                      {languageMode === 'hi' && (hindiItem || item)}
                      {languageMode === 'dual' && (
                        <div className="space-y-0.5">
                          <div>{item}</div>
                          {hindiItem && hindiItem !== item && (
                            <div className="text-[11px] text-slate-500 font-normal">{hindiItem}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured Examination Option Choices */}
      {(() => {
        const safeOptions = (question.options && question.options.length > 0)
          ? question.options
          : [
            { id: 'A', text: 'Option A' },
            { id: 'B', text: 'Option B' },
            { id: 'C', text: 'Option C' },
            { id: 'D', text: 'Option D' }
          ];

        return (
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {safeOptions.map((opt, optIdx) => {
              const isMSQ = question.questionType === 'multiple_select';
              const isSelected = isMSQ
                ? (userAnswer?.selectedOptionIds || []).includes(opt.id)
                : selectedOptionId === opt.id;
              // Clean sequential badge (A, B, C, D) based on visual index, ensuring options always show clean sequential order
              const displayLetter = ['A', 'B', 'C', 'D', 'E', 'F'][optIdx] || opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => onSelectOption(opt.id)}
                  className={`exam-option-box p-3.5 flex items-center justify-between cursor-pointer ${isSelected ? 'selected' : ''
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-6 h-6 rounded font-mono font-bold text-xs flex items-center justify-center border transition-colors ${isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                    >
                      {displayLetter}
                    </span>

                    <div className="flex flex-col text-left">
                      <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-blue-950 font-semibold' : 'text-slate-800'}`}>
                        {languageMode === 'hi' && autoHindiOptions[opt.id] ? autoHindiOptions[opt.id] : opt.text}
                      </span>
                      {languageMode === 'dual' && autoHindiOptions[opt.id] && autoHindiOptions[opt.id] !== opt.text && (
                        <span className="text-[11px] text-slate-500 pt-0.5">
                          {autoHindiOptions[opt.id]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Radio / Checkbox Indicator */}
                  <input
                    type={isMSQ ? "checkbox" : "radio"}
                    name={`q_${question.id}`}
                    checked={isSelected}
                    onChange={() => { }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded border-slate-300 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Practice Mode Rationale Box */}
      {enablePracticeMode && hasSelection && (
        <div className={`p-3.5 rounded border space-y-1.5 ${isSelectionCorrect
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
          <div className="flex items-center space-x-1.5 font-bold text-xs">
            {isSelectionCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Correct Option Selected</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Incorrect Selection (Correct: Option {correctOptionIds.join(', ')})</span>
              </>
            )}
          </div>
          {question.explanation && (
            <p className="text-xs text-slate-700 leading-relaxed pt-1 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Explanation:</span> {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Action Footer: Clear Choice & Mark for Review */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <button
          onClick={onClearChoice}
          disabled={!hasSelection}
          className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 font-medium transition-colors"
        >
          Clear Response
        </button>

        <button
          onClick={onToggleBookmark}
          className={`px-3 py-1.5 rounded text-xs font-medium border flex items-center space-x-1.5 transition-colors ${isMarked
              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-white' : ''}`} />
          <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
        </button>
      </div>

    </div>
  );
};
