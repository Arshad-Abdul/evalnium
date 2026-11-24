import React from 'react';
import { X, Check, XCircle, MinusCircle, AlertCircle, BookOpen, HelpCircle } from 'lucide-react';
import type { Quiz, QuizAttemptResult, Question, Option, UserAnswer } from '../../types/quiz';
import { getItemPrefix, cleanItemText } from '../../utils/parsers';
import { FormattedQuestionStem } from '../common/FormattedQuestionStem';

interface CandidateResponseModalProps {
  attemptResult: QuizAttemptResult;
  quiz: Quiz | null;
  onClose: () => void;
}

/**
 * Bulletproof option matcher supporting:
 * - Direct ID match ('A' === 'A', 'opt_1' === 'opt_1')
 * - Case-insensitive match ('a' === 'A')
 * - Sequential letter by index (optIdx 0 -> 'A', 1 -> 'B')
 * - 1-based numeric conversion ('1' -> 'A', '2' -> 'B', '3' -> 'C', '4' -> 'D')
 * - 0-based numeric index (0 -> 'A', 1 -> 'B')
 * - Prefixed IDs ('opt_a', 'option 1', 'A.')
 * - Option text match fallback
 */
export function matchOption(
  opt: { id: string; text?: string },
  optIdx: number,
  target: any
): boolean {
  if (target === null || target === undefined || target === '') return false;

  const targetStr = String(target).trim();
  const targetUpper = targetStr.toUpperCase();
  const optIdStr = String(opt.id || '').trim();
  const optIdUpper = optIdStr.toUpperCase();

  // 1. Direct equality
  if (optIdUpper === targetUpper) return true;

  // 2. Standard sequential letters (A, B, C, D, E, F)
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const expectedLetter = letters[optIdx];
  if (expectedLetter && expectedLetter === targetUpper) return true;

  // 3. Numeric conversions: 1->A, 2->B, 3->C, 4->D, 5->E, 6->F
  const numToLetterMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F' };
  const letterToNumMap: Record<string, string> = { 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6' };

  if (numToLetterMap[targetUpper] && (optIdUpper === numToLetterMap[targetUpper] || expectedLetter === numToLetterMap[targetUpper])) {
    return true;
  }
  if (letterToNumMap[targetUpper] && (optIdUpper === letterToNumMap[targetUpper] || String(optIdx + 1) === targetUpper)) {
    return true;
  }

  // 4. Numeric index matching
  const parsedInt = parseInt(targetStr, 10);
  if (!isNaN(parsedInt)) {
    if (parsedInt === optIdx + 1) return true; // 1-based
    if (parsedInt === optIdx) return true; // 0-based
  }

  // 5. Clean prefix e.g. "opt_1", "opt_A", "option A", "A.", "A)"
  const cleanedTarget = targetUpper.replace(/^(OPT|OPTION)[_\-\s]*/i, '').replace(/[\.\)]+$/, '').trim();
  if (cleanedTarget && (cleanedTarget === optIdUpper || cleanedTarget === expectedLetter)) return true;
  if (numToLetterMap[cleanedTarget] && (optIdUpper === numToLetterMap[cleanedTarget] || expectedLetter === numToLetterMap[cleanedTarget])) {
    return true;
  }

  // 6. Option text match fallback
  if (opt.text && opt.text.trim().toLowerCase() === targetStr.toLowerCase()) return true;

  return false;
}

export function isCandidateSelected(
  opt: Option,
  optIdx: number,
  answer?: UserAnswer | null
): boolean {
  if (!answer) return false;

  // Multiple Select
  if (Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0) {
    return answer.selectedOptionIds.some(sel => matchOption(opt, optIdx, sel));
  }

  // Single Select
  if (answer.selectedOptionId !== null && answer.selectedOptionId !== undefined && answer.selectedOptionId !== '') {
    return matchOption(opt, optIdx, answer.selectedOptionId);
  }

  return false;
}

export function isOptionCorrectKey(
  opt: Option,
  optIdx: number,
  q: Question
): boolean {
  if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
    return q.correctOptionIds.some(corr => matchOption(opt, optIdx, corr));
  }
  if (q.correctOptionId !== null && q.correctOptionId !== undefined && q.correctOptionId !== '') {
    return matchOption(opt, optIdx, q.correctOptionId);
  }
  return false;
}

export const CandidateResponseModal: React.FC<CandidateResponseModalProps> = ({ attemptResult, quiz, onClose }) => {
  if (!quiz) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quiz Not Found</h3>
            <p className="text-sm text-slate-500 mt-1">The original exam data for this attempt has been deleted or is unavailable. Responses cannot be rendered.</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl w-full">Close</button>
        </div>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Pre-calculate correct/wrong for each question
  const responseData = quiz.questions.map((q, idx) => {
    // Robust answer lookup: try by q.id, or find matching questionId property, or numeric index
    const userAnswers = attemptResult.userAnswers || {};
    const answer: UserAnswer | undefined = userAnswers[q.id] ||
      Object.values(userAnswers).find((a: any) => a?.questionId === q.id) ||
      userAnswers[String(idx)];

    let status: 'correct' | 'wrong' | 'skipped' = 'skipped';

    const isMSQ = q.questionType === 'multiple_select';
    const hasMultipleAnswers = Array.isArray(answer?.selectedOptionIds) && answer.selectedOptionIds.length > 0;
    const hasSingleAnswer = answer?.selectedOptionId !== null && answer?.selectedOptionId !== undefined && answer?.selectedOptionId !== '';

    if (isMSQ || hasMultipleAnswers) {
      const selected = answer?.selectedOptionIds || (hasSingleAnswer ? [answer!.selectedOptionId!] : []);
      const correct = Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0
        ? q.correctOptionIds
        : (q.correctOptionId ? [q.correctOptionId] : []);

      if (selected.length === 0) {
        status = 'skipped';
      } else {
        // Compare using matchOption
        const allSelectedCorrect = selected.every(sel =>
          q.options.some((opt, oIdx) => matchOption(opt, oIdx, sel) && isOptionCorrectKey(opt, oIdx, q))
        );
        const allCorrectSelected = correct.every(corr =>
          q.options.some((opt, oIdx) => matchOption(opt, oIdx, corr) && isCandidateSelected(opt, oIdx, answer))
        );
        status = (allSelectedCorrect && allCorrectSelected) ? 'correct' : 'wrong';
      }
    } else if (hasSingleAnswer) {
      // Check if selected option is the correct option
      const pickedOptionIndex = q.options.findIndex((opt, oIdx) => matchOption(opt, oIdx, answer!.selectedOptionId));
      if (pickedOptionIndex !== -1) {
        status = isOptionCorrectKey(q.options[pickedOptionIndex], pickedOptionIndex, q) ? 'correct' : 'wrong';
      } else {
        // Fallback direct comparison
        status = matchOption({ id: q.correctOptionId }, -1, answer!.selectedOptionId) ? 'correct' : 'wrong';
      }
    } else {
      status = 'skipped';
    }

    // Determine readable label for candidate choice
    let candidateChoiceLabel = 'Skipped / Unattempted';
    if (status !== 'skipped' && answer) {
      if (hasMultipleAnswers) {
        const labels = answer.selectedOptionIds!.map(sel => {
          const matchIdx = q.options.findIndex((opt, oIdx) => matchOption(opt, oIdx, sel));
          return matchIdx !== -1 ? (letters[matchIdx] || q.options[matchIdx].id) : String(sel);
        });
        candidateChoiceLabel = labels.join(', ');
      } else if (hasSingleAnswer) {
        const matchIdx = q.options.findIndex((opt, oIdx) => matchOption(opt, oIdx, answer.selectedOptionId));
        candidateChoiceLabel = matchIdx !== -1 ? `Option ${letters[matchIdx] || q.options[matchIdx].id}` : `Option ${answer.selectedOptionId}`;
      }
    }

    // Determine readable label for correct answer
    let correctKeyLabel = 'N/A';
    if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
      const labels = q.correctOptionIds.map(c => {
        const matchIdx = q.options.findIndex((opt, oIdx) => matchOption(opt, oIdx, c));
        return matchIdx !== -1 ? (letters[matchIdx] || q.options[matchIdx].id) : String(c);
      });
      correctKeyLabel = labels.join(', ');
    } else if (q.correctOptionId) {
      const matchIdx = q.options.findIndex((opt, oIdx) => matchOption(opt, oIdx, q.correctOptionId));
      correctKeyLabel = matchIdx !== -1 ? `Option ${letters[matchIdx] || q.options[matchIdx].id}` : `Option ${q.correctOptionId}`;
    }

    return {
      q,
      answer,
      status,
      idx,
      candidateChoiceLabel,
      correctKeyLabel
    };
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col p-2.5 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-w-5xl w-full mx-auto h-full overflow-hidden my-auto max-h-[96vh]">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-2.5 bg-slate-50 rounded-t-2xl flex-shrink-0">
          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-lg font-black text-slate-900 leading-tight truncate">
                Candidate Responses
              </h2>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                Audit View
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 truncate">
              <span className="font-bold text-indigo-700">{attemptResult.candidateName}</span>
              {attemptResult.candidateEmail ? ` (${attemptResult.candidateEmail})` : ''} • {attemptResult.quizTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shadow-xs border border-slate-200 cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Score Summary Banner */}
        <div className="bg-slate-900 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold flex-shrink-0 shadow-inner">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span>Score: <span className="font-mono text-indigo-300 font-black">{attemptResult.score} / {attemptResult.maxScore}</span></span>
            <span>Percentage: <span className="font-mono text-indigo-300 font-black">{attemptResult.percentage}%</span></span>
            <span>Result: <span className={`px-2 py-0.5 rounded ml-1 text-white ${attemptResult.passed ? 'bg-emerald-600' : 'bg-rose-600'}`}>{attemptResult.passed ? 'PASSED ✓' : 'FAILED ✗'}</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded text-emerald-300" title="Correct">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> <span>{attemptResult.correctAnswers}</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 rounded text-rose-300" title="Wrong">
              <XCircle className="w-3.5 h-3.5 text-rose-400" /> <span>{attemptResult.wrongAnswers}</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded text-amber-300" title="Skipped">
              <MinusCircle className="w-3.5 h-3.5 text-amber-400" /> <span>{attemptResult.skippedQuestions}</span>
            </span>
          </div>
        </div>

        {/* Responses List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-100/70">
          {responseData.map(({ q, answer, status, idx, candidateChoiceLabel, correctKeyLabel }) => (
            <div key={q.id || idx} className={`rounded-2xl border shadow-sm bg-white overflow-hidden ${status === 'correct' ? 'border-emerald-300 ring-1 ring-emerald-200' :
                status === 'wrong' ? 'border-rose-300 ring-1 ring-rose-200' : 'border-amber-300'
              }`}>

              {/* Question Header */}
              <div className={`px-4 py-2.5 border-b flex justify-between items-center ${status === 'correct' ? 'bg-emerald-50/90 border-emerald-200' :
                  status === 'wrong' ? 'bg-rose-50/90 border-rose-200' : 'bg-amber-50/90 border-amber-200'
                }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider ${status === 'correct' ? 'text-emerald-900' :
                      status === 'wrong' ? 'text-rose-900' : 'text-amber-900'
                    }`}>
                    Question {idx + 1}
                  </span>
                  {q.questionType === 'multiple_select' && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      MSQ
                    </span>
                  )}
                  {q.questionType === 'match_following' && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                      Match Following
                    </span>
                  )}
                </div>

                <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border flex items-center space-x-1.5 shadow-2xs ${status === 'correct' ? 'bg-emerald-100 border-emerald-300 text-emerald-900' :
                    status === 'wrong' ? 'bg-rose-100 border-rose-300 text-rose-900' : 'bg-amber-100 border-amber-300 text-amber-900'
                  }`}>
                  {status === 'correct' && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                  {status === 'wrong' && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
                  {status === 'skipped' && <MinusCircle className="w-3.5 h-3.5 text-amber-700" />}
                  <span>{status.toUpperCase()}</span>
                </span>
              </div>

              {/* Question Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Passage */}
                {q.passage && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center space-x-2 text-xs font-bold text-blue-950 uppercase">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reading Comprehension Passage</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-serif max-h-48 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-line border border-blue-100 rounded-lg p-2.5 bg-white">
                      {q.passage}
                    </div>
                  </div>
                )}

                {/* Question Stem */}
                <FormattedQuestionStem text={q.questionText} className="text-sm font-semibold text-slate-900 leading-relaxed" />
                {q.imageUrl && (
                  <img src={q.imageUrl} alt="Question Graphic" className="max-h-56 rounded-lg border border-slate-200 object-contain" />
                )}

                {/* Match the Following List I vs List II Box */}
                {q.questionType === 'match_following' && (q.listI || q.listII) && (
                  <div className="my-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {q.listI && q.listI.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-slate-900 font-extrabold block border-b border-slate-200 pb-1 font-mono uppercase">
                            {q.listITitle || 'List I'}
                          </span>
                          {q.listI.map((item, itemIdx) => {
                            if (!item) return null;
                            const prefix = getItemPrefix(itemIdx, q.listIOrder || 'alpha_upper');
                            return (
                              <div key={itemIdx} className="p-2 rounded-lg bg-white border border-slate-200 font-medium text-slate-800 flex items-center gap-2 shadow-2xs">
                                {prefix && <span className="font-mono font-bold text-indigo-700 shrink-0">{prefix}</span>}
                                <span>{cleanItemText(item)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {q.listII && q.listII.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-slate-900 font-extrabold block border-b border-slate-200 pb-1 font-mono uppercase">
                            {q.listIITitle || 'List II'}
                          </span>
                          {q.listII.map((item, itemIdx) => {
                            if (!item) return null;
                            const prefix = getItemPrefix(itemIdx, q.listIIOrder || 'roman_upper');
                            return (
                              <div key={itemIdx} className="p-2 rounded-lg bg-white border border-slate-200 font-medium text-slate-800 flex items-center gap-2 shadow-2xs">
                                {prefix && <span className="font-mono font-bold text-indigo-700 shrink-0">{prefix}</span>}
                                <span>{cleanItemText(item)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prominent Candidate Choice vs Correct Answer Audit Banner */}
                <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs ${status === 'correct' ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' :
                    status === 'wrong' ? 'bg-rose-50/90 border-rose-300 text-rose-950' :
                      'bg-amber-50/90 border-amber-300 text-amber-950'
                  }`}>
                  <div className="flex flex-wrap items-center gap-3">
                    {status === 'skipped' ? (
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <MinusCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Candidate Skipped / Unattempted</span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 font-bold ${status === 'correct' ? 'text-emerald-900' : 'text-rose-900'}`}>
                        {status === 'correct' ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>Candidate Selected:</span>
                        <span className={`px-2.5 py-0.5 rounded-lg font-mono font-black text-xs shadow-2xs border ${status === 'correct'
                            ? 'bg-emerald-200 border-emerald-400 text-emerald-950'
                            : 'bg-rose-200 border-rose-400 text-rose-950'
                          }`}>
                          {candidateChoiceLabel}
                        </span>
                      </div>
                    )}

                    <span className="text-slate-300 hidden sm:inline">•</span>

                    <div className="flex items-center gap-2 font-bold text-emerald-950">
                      <span className="text-slate-600 font-semibold">Correct Answer Key:</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-950 font-mono font-black text-xs shadow-2xs">
                        {correctKeyLabel}
                      </span>
                    </div>
                  </div>

                  {answer?.timeSpentSeconds !== undefined && (
                    <div className="text-[11px] font-mono text-slate-500 font-medium">
                      Time on Question: <strong className="text-slate-800 font-bold">{answer.timeSpentSeconds}s</strong>
                    </div>
                  )}
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {q.options.map((opt, optIdx) => {
                    const isCandidateChoice = isCandidateSelected(opt, optIdx, answer);
                    const isRightAnswer = isOptionCorrectKey(opt, optIdx, q);
                    const displayLetter = letters[optIdx] || opt.id;

                    let bgClass = "bg-slate-50 border-slate-200 text-slate-700";
                    let badgeNode = null;

                    if (isRightAnswer && isCandidateChoice) {
                      // Candidate chose this AND it's correct
                      bgClass = "bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-medium ring-2 ring-emerald-200/50 shadow-xs";
                      badgeNode = (
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                          <Check className="w-3 h-3" /> Candidate's Choice (Correct)
                        </span>
                      );
                    } else if (isRightAnswer && !isCandidateChoice) {
                      // This is the correct answer that candidate missed
                      bgClass = "bg-emerald-50/70 border-2 border-emerald-400 text-emerald-900 border-dashed font-medium";
                      badgeNode = (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Correct Key
                        </span>
                      );
                    } else if (!isRightAnswer && isCandidateChoice) {
                      // Candidate chose this WRONGLY
                      bgClass = "bg-rose-50 border-2 border-rose-500 text-rose-950 font-medium ring-2 ring-rose-200/50 shadow-xs";
                      badgeNode = (
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                          <XCircle className="w-3 h-3" /> Candidate Selected (Incorrect)
                        </span>
                      );
                    }

                    return (
                      <div key={opt.id || optIdx} className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${bgClass}`}>
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-black border shrink-0 ${isRightAnswer
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : isCandidateChoice
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white border-slate-300 text-slate-700'
                            }`}>
                            {displayLetter}
                          </span>
                          <div className="text-sm font-medium pt-0.5 leading-snug flex-1">
                            {opt.text}
                          </div>
                        </div>

                        {badgeNode && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex justify-end">
                            {badgeNode}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Rationale Box */}
                {(q.explanation || q.explanationEnglish || q.explanationHindi) && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/90 text-xs space-y-1.5 mt-3">
                    <div className="flex items-center gap-1.5 text-indigo-950 font-bold uppercase tracking-wider text-[11px]">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Explanation & Concept Rationale</span>
                    </div>
                    <div className="text-slate-800 leading-relaxed font-sans whitespace-pre-line pl-5 border-l-2 border-indigo-300">
                      {q.explanation || q.explanationEnglish || q.explanationHindi}
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
