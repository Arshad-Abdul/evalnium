import React, { useState, useEffect } from 'react';
import type { Question, UserAnswer } from '../../types/quiz';
import { translateToHindi } from '../../utils/translator';
import { getItemPrefix, cleanItemText } from '../../utils/parsers';
import { Bookmark, Clock, CheckCircle2, XCircle, BookOpen, Lock } from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';
import { FormattedQuestionStem } from '../common/FormattedQuestionStem';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  userAnswer: UserAnswer;
  languageMode: 'dual' | 'en' | 'hi';
  enablePracticeMode?: boolean;
  lockOptionOnSelect?: boolean;
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
  lockOptionOnSelect,
  onSelectOption,
  onClearChoice,
  onToggleBookmark,
}) => {
  const selectedOptionId = userAnswer?.selectedOptionId || null;
  const selectedOptionIds = userAnswer?.selectedOptionIds || [];
  const isMarked = userAnswer?.isMarkedForReview || false;
  const timeSpent = userAnswer?.timeSpentSeconds || 0;
  const hasSelection = Boolean(selectedOptionId || selectedOptionIds.length > 0);
  const isAnswerLocked = Boolean(enablePracticeMode && lockOptionOnSelect && hasSelection);

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
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const safeOptions = (question.options && question.options.length > 0)
    ? question.options
    : [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
      { id: 'C', text: 'Option C' },
      { id: 'D', text: 'Option D' }
    ];

  const correctOptionIds = Array.isArray(question.correctOptionIds) && question.correctOptionIds.length > 0
    ? question.correctOptionIds
    : (question.correctOptionId ? [question.correctOptionId] : []);

  // Robust comparison: single-select or multi-select with case-insensitive normalization
  const isSelectionCorrect = isMultiSelect
    ? selectedOptionIds.length > 0 &&
      selectedOptionIds.length === correctOptionIds.length &&
      selectedOptionIds.every((id) =>
        correctOptionIds.some((c) => String(c).trim().toUpperCase() === String(id).trim().toUpperCase())
      )
    : selectedOptionId !== null &&
      selectedOptionId !== undefined &&
      correctOptionIds.some((c) => String(c).trim().toUpperCase() === String(selectedOptionId).trim().toUpperCase());

  // Resolve visual letters & texts for the correct options as currently rendered on screen
  const correctOptionDetails = React.useMemo(() => {
    return correctOptionIds.map((cId) => {
      const cleanCId = String(cId).trim().toUpperCase();
      // 1. Try finding by matching opt.id
      let optIdx = safeOptions.findIndex(
        (o) => String(o.id).trim().toUpperCase() === cleanCId
      );
      // 2. Fallback: check if cId is a direct letter index
      if (optIdx === -1) {
        const letterIdx = letters.indexOf(cleanCId);
        if (letterIdx !== -1 && letterIdx < safeOptions.length) {
          optIdx = letterIdx;
        }
      }

      const visualLetter = optIdx !== -1 ? (letters[optIdx] || String(cId)) : String(cId);
      const opt = optIdx !== -1 ? safeOptions[optIdx] : null;
      const optText = opt ? opt.text : '';
      const optId = opt ? opt.id : cId;
      return {
        id: optId,
        letter: visualLetter,
        text: optText,
      };
    });
  }, [safeOptions, correctOptionIds]);

  const correctVisualLetters = correctOptionDetails.map((d) => d.letter).join(', ');

  const renderQuestionText = () => {
    const englishQ = question.questionEnglish || question.questionText;
    const hindiQ = question.questionHindi || autoHindiText;

    if (languageMode === 'en') {
      return (
        <FormattedQuestionStem
          text={englishQ}
          className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed"
        />
      );
    }
    if (languageMode === 'hi') {
      return (
        <FormattedQuestionStem
          text={hindiQ || englishQ}
          className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed"
        />
      );
    }
    if (languageMode === 'dual') {
      return (
        <div className="space-y-4">
          <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-2 align-middle">
              ENGLISH
            </span>
            <FormattedQuestionStem text={englishQ} />
          </div>
          <div className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed pt-3 border-t border-slate-100">
            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2 align-middle">
              हिन्दी
            </span>
            <FormattedQuestionStem text={hindiQ || 'हिन्दी रूपान्तरण लोड हो रहा है...'} />
          </div>
        </div>
      );
    }

    return (
      <FormattedQuestionStem
        text={englishQ}
        className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed"
      />
    );
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

      {/* Reading Comprehension Passage / Case Study */}
      {question.passage && (
        <div className="rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200/70">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-950 tracking-wide uppercase">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Reading Comprehension Passage</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
              Read carefully & answer below
            </span>
          </div>
          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-serif max-h-64 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-line select-text border border-blue-100/60 rounded-lg p-3 bg-white/80">
            {question.passage}
          </div>
        </div>
      )}

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
        <div className="my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {question.listI && question.listI.some(Boolean) && (
              <div className="space-y-2">
                <span className="text-slate-900 font-extrabold block border-b border-slate-200 pb-1.5 font-mono text-xs uppercase tracking-wide">
                  {question.listITitle || 'List I'}
                </span>
                {question.listI.map((item, idx) => {
                  if (!item) return null;
                  const hindiItem = autoHindiListI[idx];
                  const prefix = getItemPrefix(idx, question.listIOrder || 'alpha_upper');
                  const displayText = cleanItemText(item);
                  const displayHindi = hindiItem ? cleanItemText(hindiItem) : '';

                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 font-medium text-slate-800 flex items-start gap-2 shadow-2xs">
                      {prefix && (
                        <span className="w-6 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold text-xs text-center shrink-0 select-none">
                          {prefix}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        {languageMode === 'en' && displayText}
                        {languageMode === 'hi' && (displayHindi || displayText)}
                        {languageMode === 'dual' && (
                          <div className="space-y-0.5">
                            <div>{displayText}</div>
                            {displayHindi && displayHindi !== displayText && (
                              <div className="text-[11px] text-slate-500 font-normal">{displayHindi}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {question.listII && question.listII.some(Boolean) && (
              <div className="space-y-2">
                <span className="text-slate-900 font-extrabold block border-b border-slate-200 pb-1.5 font-mono text-xs uppercase tracking-wide">
                  {question.listIITitle || 'List II'}
                </span>
                {question.listII.map((item, idx) => {
                  if (!item) return null;
                  const hindiItem = autoHindiListII[idx];
                  const prefix = getItemPrefix(idx, question.listIIOrder || 'roman_upper');
                  const displayText = cleanItemText(item);
                  const displayHindi = hindiItem ? cleanItemText(hindiItem) : '';

                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 font-medium text-slate-800 flex items-start gap-2 shadow-2xs">
                      {prefix && (
                        <span className="w-6 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold text-xs text-center shrink-0 select-none">
                          {prefix}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        {languageMode === 'en' && displayText}
                        {languageMode === 'hi' && (displayHindi || displayText)}
                        {languageMode === 'dual' && (
                          <div className="space-y-0.5">
                            <div>{displayText}</div>
                            {displayHindi && displayHindi !== displayText && (
                              <div className="text-[11px] text-slate-500 font-normal">{displayHindi}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured Examination Option Choices */}
      <div className="grid grid-cols-1 gap-2.5 pt-1">
        {safeOptions.map((opt, optIdx) => {
          const isMSQ = question.questionType === 'multiple_select';
          const isSelected = isMSQ
            ? (userAnswer?.selectedOptionIds || []).includes(opt.id)
            : selectedOptionId === opt.id;
          // Clean sequential badge (A, B, C, D) based on visual index, ensuring options always show clean sequential order
          const displayLetter = letters[optIdx] || opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => {
                if (!isAnswerLocked) {
                  onSelectOption(opt.id);
                }
              }}
              className={`exam-option-box p-3.5 flex items-center justify-between gap-3 ${
                isAnswerLocked ? 'cursor-not-allowed select-none' : 'cursor-pointer'
              } ${isSelected ? 'selected' : ''}`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <span
                  className={`w-6 h-6 rounded font-mono font-bold text-xs flex items-center justify-center border transition-colors shrink-0 ${isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                >
                  {displayLetter}
                </span>

                <div className="flex flex-col text-left min-w-0 flex-1 break-words">
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
                disabled={isAnswerLocked}
                onChange={() => { }}
                className={`w-4 h-4 text-blue-600 focus:ring-blue-500 rounded border-slate-300 shrink-0 ${
                  isAnswerLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Practice Mode Rationale Box */}
      {enablePracticeMode && hasSelection && (
        <div className={`p-3.5 rounded-xl border space-y-2 shadow-xs transition-all ${isSelectionCorrect
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/90 border-rose-300 text-rose-950'
          }`}>
          <div className="flex items-center space-x-2 font-bold text-xs">
            {isSelectionCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-900 font-bold">Correct Option Selected!</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-rose-950 font-bold">
                  Incorrect Selection (Correct: Option {correctVisualLetters})
                </span>
              </>
            )}
          </div>

          {!isSelectionCorrect && correctOptionDetails.some(d => Boolean(d.text)) && (
            <div className="text-xs text-rose-900 bg-rose-100/70 border border-rose-200/90 rounded-lg px-2.5 py-1.5 leading-relaxed font-medium">
              <span className="font-bold text-rose-950">Correct Key:</span>{' '}
              {correctOptionDetails.map((d, i) => {
                const hindiText = autoHindiOptions[d.id];
                const displayText = languageMode === 'hi' && hindiText ? hindiText : d.text;
                return (
                  <span key={d.id || i}>
                    {i > 0 && ' • '}
                    <strong className="text-rose-950 font-bold font-mono">[{d.letter}]</strong> {cleanItemText(displayText)}
                  </span>
                );
              })}
            </div>
          )}

          {question.explanation && (
            <p className="text-xs text-slate-700 leading-relaxed pt-1.5 border-t border-slate-200/80">
              <span className="font-bold text-slate-900">Explanation:</span> {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Action Footer: Clear Choice & Mark for Review */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClearChoice}
            disabled={!hasSelection || isAnswerLocked}
            className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 font-medium transition-colors"
            title={isAnswerLocked ? 'Answer is locked in practice mode' : 'Clear your answer choice'}
          >
            Clear Response
          </button>
          {isAnswerLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[11px]" title="Choice locked to protect exam integrity">
              <Lock className="w-3 h-3 text-amber-700" />
              <span>Answer Locked</span>
            </span>
          )}
        </div>

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
