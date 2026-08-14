import React, { useEffect, useState } from 'react';
import type { QuizAttemptResult, Quiz, Question, UserAnswer } from '../../types/quiz';
import { getStoredResults } from '../../utils/storage';
import { translateToHindi } from '../../utils/translator';
import confetti from 'canvas-confetti';
import { Trophy, AlertCircle, RotateCcw, Home, HelpCircle, BookOpen, Languages, Target, UserCheck, Clock } from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';

interface ExamResultViewProps {
  result: QuizAttemptResult;
  quiz: Quiz;
  onRetake: () => void;
  onGoHome: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  result,
  quiz,
  onRetake,
  onGoHome,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
  const [languageMode, setLanguageMode] = useState<'dual' | 'en' | 'hi'>('dual');
  const [allAttempts, setAllAttempts] = useState<QuizAttemptResult[]>([]);
  const [autoHindiMap, setAutoHindiMap] = useState<Record<string, {
    questionText?: string;
    options: Record<string, string>;
    listI?: string[];
    listII?: string[];
    explanation?: string;
  }>>({});

  useEffect(() => {
    const history = getStoredResults();
    setAllAttempts(history);

    if (result.passed) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore if confetti fails
      }
    }
  }, [result.passed]);

  // Auto-translate questions to Hindi if not present
  useEffect(() => {
    let isMounted = true;
    if (languageMode === 'hi' || languageMode === 'dual') {
      quiz.questions.forEach((q) => {
        const srcQ = q.questionEnglish || q.questionText;
        if (srcQ && !q.questionHindi) {
          translateToHindi(srcQ).then((translated) => {
            if (isMounted && translated) {
              setAutoHindiMap((prev) => ({
                ...prev,
                [q.id]: {
                  ...(prev[q.id] || { options: {} }),
                  questionText: translated,
                }
              }));
            }
          });
        }

        // Translate Options
        if (q.options) {
          q.options.forEach((opt) => {
            if (opt.text && opt.text.trim()) {
              translateToHindi(opt.text).then((translated) => {
                if (isMounted && translated) {
                  setAutoHindiMap((prev) => {
                    const current = prev[q.id] || { options: {} };
                    return {
                      ...prev,
                      [q.id]: {
                        ...current,
                        options: {
                          ...current.options,
                          [opt.id]: translated,
                        }
                      }
                    };
                  });
                }
              });
            }
          });
        }

        // Translate List I & List II
        if (q.listI && q.listI.length > 0) {
          Promise.all(q.listI.map(item => item ? translateToHindi(item) : Promise.resolve(''))).then(resList => {
            if (isMounted && resList.some(Boolean)) {
              setAutoHindiMap((prev) => ({
                ...prev,
                [q.id]: {
                  ...(prev[q.id] || { options: {} }),
                  listI: resList,
                }
              }));
            }
          });
        }

        if (q.listII && q.listII.length > 0) {
          Promise.all(q.listII.map(item => item ? translateToHindi(item) : Promise.resolve(''))).then(resList => {
            if (isMounted && resList.some(Boolean)) {
              setAutoHindiMap((prev) => ({
                ...prev,
                [q.id]: {
                  ...(prev[q.id] || { options: {} }),
                  listII: resList,
                }
              }));
            }
          });
        }

        // Translate Explanation
        if (q.explanation && !q.explanationHindi) {
          translateToHindi(q.explanation).then((translated) => {
            if (isMounted && translated) {
              setAutoHindiMap((prev) => ({
                ...prev,
                [q.id]: {
                  ...(prev[q.id] || { options: {} }),
                  explanation: translated,
                }
              }));
            }
          });
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [quiz.questions, languageMode]);

  // Calculate Percentile Rank & Topper Comparison
  const quizAttempts = allAttempts.filter(a => a.quizId === quiz.id);
  const totalTakers = Math.max(1, quizAttempts.length);
  const lowerScoringTakers = quizAttempts.filter(a => a.percentage < result.percentage).length;
  const percentileRank = Math.min(99.9, Math.max(10, Math.round(((lowerScoringTakers + 1) / totalTakers) * 1000) / 10));

  // Rank #1 Topper
  const topper = quizAttempts.sort((a, b) => b.percentage - a.percentage)[0] || result;

  // Gate results behind announcement date
  const announcementDate = quiz.resultAnnouncementDateTime ? new Date(quiz.resultAnnouncementDateTime) : null;
  const resultsVisible = !announcementDate || new Date() >= announcementDate;

  if (!resultsVisible) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6 animate-in fade-in duration-300">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-sm">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">Exam Submitted!</h2>
          <p className="text-sm text-slate-500 font-medium">Your answers have been securely recorded and will be evaluated.</p>
        </div>
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Results will be announced on</p>
          <p className="text-lg font-black text-amber-900 font-mono">
            {announcementDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm font-bold text-amber-800">
            at {announcementDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={onGoHome}
          className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all"
        >
          Back to Exam Catalog
        </button>
      </div>
    );
  }

  const isQuestionAnswered = (q: Question, uAns: UserAnswer | undefined): boolean => {
    if (!uAns) return false;
    if (q.questionType === 'multiple_select') return (uAns.selectedOptionIds?.length ?? 0) > 0;
    return uAns.selectedOptionId !== null;
  };

  const isQuestionCorrect = (q: Question, uAns: UserAnswer | undefined): boolean => {
    if (!uAns) return false;
    if (q.questionType === 'multiple_select') {
      const selected = uAns.selectedOptionIds || [];
      const correct = q.correctOptionIds || [q.correctOptionId];
      return selected.length === correct.length && selected.every((id: string) => correct.includes(id));
    }
    return uAns.selectedOptionId === q.correctOptionId;
  };

  // Topic Breakdown for Weak-Topic Radar
  const topicStats: Record<string, { total: number; correct: number }> = {};
  quiz.questions.forEach((q) => {
    const topicName = q.topic || quiz.topic || 'General';
    if (!topicStats[topicName]) {
      topicStats[topicName] = { total: 0, correct: 0 };
    }
    topicStats[topicName].total++;
    const uAns = result.userAnswers[q.id];
    if (isQuestionCorrect(q, uAns)) {
      topicStats[topicName].correct++;
    }
  });

  const weakTopics = Object.entries(topicStats).filter(
    ([, stat]) => Math.round((stat.correct / stat.total) * 100) < 60
  );

  const filteredQuestions = quiz.questions.filter((q) => {
    const uAns = result.userAnswers[q.id];
    const answered = isQuestionAnswered(q, uAns);
    const correct = answered && isQuestionCorrect(q, uAns);

    if (filterType === 'correct') return correct;
    if (filterType === 'wrong') return answered && !correct;
    if (filterType === 'skipped') return !answered;
    return true;
  });

  const renderQuestionText = (q: Question) => {
    const hindiQ = q.questionHindi || autoHindiMap[q.id]?.questionText;
    const englishQ = q.questionEnglish || q.questionText;

    if (languageMode === 'en') {
      return <h4 className="text-base font-bold text-slate-900 leading-snug">{englishQ}</h4>;
    }
    if (languageMode === 'hi') {
      return (
        <h4 className="text-base font-bold text-slate-900 leading-snug">
          {hindiQ || englishQ}
        </h4>
      );
    }
    if (languageMode === 'dual') {
      return (
        <div className="space-y-1.5">
          <div className="text-base font-bold text-slate-900 leading-snug">
            <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mr-2">EN</span>
            {englishQ}
          </div>
          <div className="text-base font-bold text-slate-800 leading-snug">
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2">HI</span>
            {hindiQ || 'हिन्दी रूपान्तरण उपलब्ध हो रहा है...'}
          </div>
        </div>
      );
    }

    return <h4 className="text-base font-bold text-slate-900 whitespace-pre-line leading-snug">{englishQ}</h4>;
  };


  const timeMinutes = Math.floor(result.timeSpentSeconds / 60);
  const timeSeconds = result.timeSpentSeconds % 60;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Top Main Scorecard Card */}
      <div className={`p-8 rounded-3xl border text-center relative overflow-hidden bg-white shadow-lg ${
        result.passed
          ? 'border-emerald-200 shadow-emerald-500/5'
          : 'border-rose-200 shadow-rose-500/5'
      }`}>
        
        <div className="max-w-md mx-auto space-y-4">
          <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-md ${
            result.passed
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}>
            {result.passed ? <Trophy className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
          </div>

          <div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase ${
                result.passed
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {result.passed ? 'EXAM PASSED 🎉' : 'NEEDS IMPROVEMENT 📚'}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                {percentileRank} Percentile 🏆
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{result.quizTitle}</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Candidate: <strong className="text-slate-800">{result.candidateName}</strong> • Topic: {result.topic}
            </p>
          </div>

          {/* Big Score Number */}
          <div className="py-2">
            <div className="text-5xl font-black font-mono tracking-tight text-slate-900">
              {result.percentage}<span className="text-2xl text-indigo-600">%</span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1 font-semibold">
              Score: {result.score} / {result.maxScore} (Passing criteria: {quiz.passingPercentage}%)
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 text-center text-xs font-medium">
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/60">
              <span className="block font-bold text-emerald-700 text-base font-mono">{result.correctAnswers}</span>
              <span className="text-[10px] text-emerald-800 font-bold">Correct</span>
            </div>

            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200/60">
              <span className="block font-bold text-rose-700 text-base font-mono">{result.wrongAnswers}</span>
              <span className="text-[10px] text-rose-800 font-bold">Incorrect</span>
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
              <span className="block font-bold text-amber-700 text-base font-mono">{result.skippedQuestions}</span>
              <span className="text-[10px] text-amber-800 font-bold">Skipped</span>
            </div>

            <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200/60">
              <span className="block font-bold text-indigo-700 text-base font-mono">
                {timeMinutes}m {timeSeconds}s
              </span>
              <span className="text-[10px] text-indigo-800 font-bold">Time Spent</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            {(() => {
              const attemptsUsed = result.attemptsCount || 1;
              const retakeLocked =
                quiz.quizType === 'live_contest' ||
                (quiz.maxAttempts && quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts);
              if (retakeLocked) {
                return (
                  <div className="w-1/2 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center space-x-2 cursor-not-allowed">
                    <span>
                      {quiz.quizType === 'live_contest'
                        ? '🔒 Retakes Disabled (Live Contest)'
                        : `🔒 Max Attempts Reached (${attemptsUsed}/${quiz.maxAttempts})`}
                    </span>
                  </div>
                );
              }
              return (
                <button
                  onClick={onRetake}
                  className="w-1/2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-indigo-600" />
                  <span>Retake Exam</span>
                </button>
              );
            })()}

            <button
              onClick={onGoHome}
              className="w-1/2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Back to Catalog</span>
            </button>
          </div>
        </div>

      </div>

      {/* Rank #1 Topper Comparison & Speed Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Topper Comparison Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>Candidate vs Rank #1 Topper Benchmark</span>
          </div>

          <div className="space-y-3 text-xs font-medium bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-600">Metric</span>
              <span className="font-bold text-slate-900">Your Score</span>
              <span className="font-bold text-amber-700">Rank #1 Topper</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Accuracy %:</span>
              <span className="font-mono font-bold text-indigo-700">{result.percentage}%</span>
              <span className="font-mono font-bold text-amber-700">{topper.percentage}%</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Completion Time:</span>
              <span className="font-mono font-bold text-indigo-700">{Math.floor(result.timeSpentSeconds / 60)}m {result.timeSpentSeconds % 60}s</span>
              <span className="font-mono font-bold text-amber-700">{Math.floor(topper.timeSpentSeconds / 60)}m {topper.timeSpentSeconds % 60}s</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-600">Percentile Rank:</span>
              <span className="font-mono font-bold text-emerald-700">{percentileRank} Percentile</span>
              <span className="font-mono font-bold text-amber-700">99.9 Percentile</span>
            </div>
          </div>
        </div>

        {/* Weak-Topic Radar Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Target className="w-5 h-5 text-rose-600" />
            <span>Weak-Topic Radar & Improvement Focus</span>
          </div>

          {weakTopics.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              🎉 Outstanding Performance! All sub-topics achieved over 60% accuracy.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">The following sub-topics need focused revision before your next exam:</p>
              {weakTopics.map(([tName, stat]) => {
                const acc = Math.round((stat.correct / stat.total) * 100);
                return (
                  <div key={tName} className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{tName}</span>
                    <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                      {acc}% Accuracy ({stat.correct}/{stat.total})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Answer Key & Explanations Review Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Detailed Question & Answer Review</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Review option choices, audio explanations, and rationale</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Mode Switcher */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 px-1.5 flex items-center space-x-1">
                <Languages className="w-3.5 h-3.5 text-indigo-600" />
              </span>
              <button
                onClick={() => setLanguageMode('dual')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  languageMode === 'dual'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dual Mode
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

            {/* Filter Pills */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['all', 'correct', 'wrong', 'skipped'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    filterType === f
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions Breakdown List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const uAns = result.userAnswers[q.id];
            const isSkipped = !isQuestionAnswered(q, uAns);
            const isCorrect = !isSkipped && isQuestionCorrect(q, uAns);
            const selectedOptId = uAns ? uAns.selectedOptionId : null;
            const selectedOptIds = uAns?.selectedOptionIds || [];

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl space-y-4 border bg-white shadow-xs transition-all ${
                  isSkipped
                    ? 'border-amber-200 bg-amber-50/20'
                    : isCorrect
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center border border-slate-200">
                      Q{idx + 1}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      isSkipped
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : isCorrect
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {isSkipped ? 'Skipped' : isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <AudioPlayerButton textToRead={q.questionEnglish || q.questionText} />
                </div>

                {renderQuestionText(q)}

                {/* Question Image / Diagram Preview */}
                {q.imageUrl && (
                  <div className="my-3 rounded-2xl overflow-hidden border border-slate-200 shadow-xs max-w-lg bg-slate-50 p-2">
                    <img src={q.imageUrl} alt={`Question ${idx + 1} Diagram`} className="w-full object-contain max-h-72 rounded-xl" />
                  </div>
                )}

                {/* Match the Following List I vs List II Box */}
                {q.questionType === 'match_following' && (q.listI || q.listII) && (
                  <div className="my-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {q.listI && q.listI.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-indigo-950 font-extrabold block border-b border-indigo-200 pb-1 uppercase tracking-wider">
                            List I
                          </span>
                          {q.listI.map((item, itemIdx) => {
                            if (!item) return null;
                            const hindiItem = autoHindiMap[q.id]?.listI?.[itemIdx];
                            return (
                              <div key={itemIdx} className="p-2.5 rounded-xl bg-white border border-indigo-100 font-bold text-slate-800 shadow-2xs">
                                {languageMode === 'en' && item}
                                {languageMode === 'hi' && (hindiItem || item)}
                                {languageMode === 'dual' && (
                                  <div className="space-y-0.5">
                                    <div>{item}</div>
                                    {hindiItem && hindiItem !== item && (
                                      <div className="text-[11px] font-semibold text-amber-800">{hindiItem}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.listII && q.listII.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-indigo-950 font-extrabold block border-b border-indigo-200 pb-1 uppercase tracking-wider">
                            List II
                          </span>
                          {q.listII.map((item, itemIdx) => {
                            if (!item) return null;
                            const hindiItem = autoHindiMap[q.id]?.listII?.[itemIdx];
                            return (
                              <div key={itemIdx} className="p-2.5 rounded-xl bg-white border border-indigo-100 font-bold text-slate-800 shadow-2xs">
                                {languageMode === 'en' && item}
                                {languageMode === 'hi' && (hindiItem || item)}
                                {languageMode === 'dual' && (
                                  <div className="space-y-0.5">
                                    <div>{item}</div>
                                    {hindiItem && hindiItem !== item && (
                                      <div className="text-[11px] font-semibold text-amber-800">{hindiItem}</div>
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

                {/* Options Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt) => {
                    const isMSQq = q.questionType === 'multiple_select';
                    const isCandidateChoice = isMSQq
                      ? selectedOptIds.includes(opt.id)
                      : selectedOptId === opt.id;
                    const correctIds = q.correctOptionIds || [q.correctOptionId];
                    const isRightAnswer = correctIds.includes(opt.id);
                    const hindiOptText = autoHindiMap[q.id]?.options?.[opt.id];

                    let optStyle = 'bg-slate-50 border-slate-200 text-slate-600';

                    if (isRightAnswer) {
                      optStyle = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold';
                    } else if (isCandidateChoice && !isRightAnswer) {
                      optStyle = 'bg-rose-50 border-rose-300 text-rose-950 font-bold';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${optStyle}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-6 h-6 rounded-md font-mono font-bold flex items-center justify-center flex-shrink-0 ${
                            isRightAnswer
                              ? 'bg-emerald-600 text-white'
                              : isCandidateChoice
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {opt.id}
                          </span>
                          <div className="flex flex-col text-left">
                            <span className="font-semibold">
                              {languageMode === 'hi' && hindiOptText ? hindiOptText : opt.text}
                            </span>
                            {languageMode === 'dual' && hindiOptText && hindiOptText !== opt.text && (
                              <span className="text-[11px] font-semibold text-amber-800 pt-0.5">
                                {hindiOptText}
                              </span>
                            )}
                          </div>
                        </div>

                        {isCandidateChoice && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-700 flex-shrink-0">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Rationale Explanation Box */}
                <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs space-y-1">
                  <span className="font-bold text-indigo-900 flex items-center space-x-1.5 text-xs">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    <span>Explanation & Answer Key Rationale:</span>
                  </span>
                  <div className="text-slate-800 leading-relaxed font-medium space-y-1">
                    {(() => {
                      const defaultExp = `Option (${q.correctOptionId}): "${q.options.find(o => o.id === q.correctOptionId)?.text || ''}" is the correct answer.`;
                      const rawExp = q.explanation || defaultExp;
                      const hindiExp = q.explanationHindi || autoHindiMap[q.id]?.explanation;

                      if (languageMode === 'en') {
                        return <p>{rawExp}</p>;
                      }
                      if (languageMode === 'hi') {
                        return <p>{hindiExp || rawExp}</p>;
                      }
                      return (
                        <div className="space-y-1">
                          <p>{rawExp}</p>
                          {hindiExp && hindiExp !== rawExp && (
                            <p className="text-indigo-950 font-semibold pt-1 border-t border-indigo-100/60">
                              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded mr-1.5">HI</span>
                              {hindiExp}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
