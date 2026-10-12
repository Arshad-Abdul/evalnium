import React, { useEffect, useState } from 'react';
import type { QuizAttemptResult, Quiz, Question, UserAnswer } from '../../types/quiz';
import { getStoredResults } from '../../utils/storage';
import { translateToHindi } from '../../utils/translator';
import { Trophy, AlertCircle, RotateCcw, Home, HelpCircle, BookOpen, Languages, Target, UserCheck, Clock, CheckCircle2, XCircle, Award } from 'lucide-react';
import { AudioPlayerButton } from '../common/AudioPlayerButton';
import { CertificateModal } from './CertificateModal';
import { QuestionDiscussion } from '../exam/QuestionDiscussion';

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
  const [showCertModal, setShowCertModal] = useState<boolean>(false);
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
  }, []);

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

  // Calculate Percentile Rank & Benchmark
  const quizAttempts = allAttempts.filter(a => a.quizId === quiz.id);
  const totalTakers = Math.max(1, quizAttempts.length);
  const lowerScoringTakers = quizAttempts.filter(a => a.percentage < result.percentage).length;
  const percentileRank = Math.min(99.9, Math.max(10, Math.round(((lowerScoringTakers + 1) / totalTakers) * 1000) / 10));

  // Rank #1 Topper Benchmark
  const topper = quizAttempts.sort((a, b) => b.percentage - a.percentage)[0] || result;

  // Gate results behind announcement date
  const announcementDate = quiz.resultAnnouncementDateTime ? new Date(quiz.resultAnnouncementDateTime) : null;
  const resultsVisible = !announcementDate || new Date() >= announcementDate;

  if (!resultsVisible && announcementDate) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-5">
        <div className="w-16 h-16 mx-auto rounded bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-700" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">Examination Submitted Successfully</h2>
          <p className="text-xs text-slate-600">Your answer script has been securely encrypted and stored for evaluation.</p>
        </div>
        <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-1">
          <p className="text-[11px] font-mono text-slate-500 uppercase">Results Announcement</p>
          <p className="text-sm font-bold text-slate-900 font-mono">
            {announcementDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at {announcementDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={onGoHome}
          className="px-6 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
        >
          Return to Exam Catalog
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

  // Syllabus Breakdown for Weak-Topic Diagnosis
  const topicStats: Record<string, { total: number; correct: number }> = {};
  quiz.questions.forEach((q) => {
    const topicName = q.topic || quiz.topic || 'General Syllabus';
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
      return <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">{englishQ}</h4>;
    }
    if (languageMode === 'hi') {
      return (
        <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
          {hindiQ || englishQ}
        </h4>
      );
    }
    if (languageMode === 'dual') {
      return (
        <div className="space-y-2">
          <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-2">EN</span>
            {englishQ}
          </div>
          <div className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed pt-1.5 border-t border-slate-100">
            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2">HI</span>
            {hindiQ || 'हिन्दी रूपान्तरण उपलब्ध हो रहा है...'}
          </div>
        </div>
      );
    }

    return <h4 className="text-sm sm:text-base font-semibold text-slate-900 whitespace-pre-line leading-relaxed">{englishQ}</h4>;
  };

  const timeMinutes = Math.floor(result.timeSpentSeconds / 60);
  const timeSeconds = result.timeSpentSeconds % 60;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Official Scorecard Transcript Banner */}
      <div className="portal-card p-6 sm:p-7 bg-white border border-slate-200 space-y-6">

        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Assessment Scorecard
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {result.quizTitle}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Candidate: <strong className="text-slate-900 font-semibold">{result.candidateName}</strong> • Paper: {result.topic}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded font-mono font-semibold text-xs uppercase border ${result.passed
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
              {result.passed ? 'Status: QUALIFIED' : 'Status: NOT QUALIFIED'}
            </span>

            <span className="px-2.5 py-1 rounded font-mono font-semibold text-xs bg-slate-100 text-slate-800 border border-slate-200">
              {percentileRank}th Percentile
            </span>
          </div>
        </div>

        {/* 4-Column Structured Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Percentage Score</span>
            <span className="text-2xl font-bold font-mono text-slate-900">{result.percentage}%</span>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{result.score} / {result.maxScore} Marks</span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded border border-emerald-200">
            <span className="text-[10px] font-mono text-emerald-800 uppercase block">Correct Responses</span>
            <span className="text-2xl font-bold font-mono text-emerald-800">{result.correctAnswers}</span>
            <span className="text-[10px] font-mono text-emerald-600 block mt-0.5">Accuracy</span>
          </div>

          <div className="bg-rose-50/70 p-3 rounded border border-rose-200">
            <span className="text-[10px] font-mono text-rose-800 uppercase block">Incorrect Responses</span>
            <span className="text-2xl font-bold font-mono text-rose-800">{result.wrongAnswers}</span>
            <span className="text-[10px] font-mono text-rose-600 block mt-0.5">Negative Marking</span>
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Time Used</span>
            <span className="text-2xl font-bold font-mono text-slate-900">{timeMinutes}m {timeSeconds}s</span>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{result.skippedQuestions} Skipped</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
          {(() => {
            const attemptsUsed = result.attemptsCount || 1;
            const retakeLocked =
              quiz.quizType === 'live_contest' ||
              (quiz.maxAttempts && quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts);
            if (retakeLocked) {
              return (
                <div className="px-3 py-1.5 rounded border border-slate-200 bg-slate-100 text-slate-500 text-xs font-mono cursor-not-allowed">
                  <span>
                    {quiz.quizType === 'live_contest'
                      ? 'Locked (1-Attempt Contest)'
                      : `Attempts Exhausted (${attemptsUsed}/${quiz.maxAttempts})`}
                  </span>
                </div>
              );
            }
            return (
              <button
                onClick={onRetake}
                className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Re-Attempt Examination</span>
              </button>
            );
          })()}

          {/* Official QR-Code Verifiable Certificate */}
          {quiz.enableCertificate !== false && result.passed && (
            <button
              onClick={() => setShowCertModal(true)}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Verified QR Certificate</span>
            </button>
          )}

          <button
            onClick={onGoHome}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Catalog</span>
          </button>
        </div>

      </div>

      {/* Benchmark Topper Comparison & Syllabus Diagnosis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Topper Benchmark Table */}
        <div className="portal-card p-5 bg-white border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs sm:text-sm">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Candidate vs Rank #1 Benchmark</span>
          </div>

          <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded border border-slate-200">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 text-slate-500 text-[11px]">
              <span>Parameter</span>
              <span className="font-semibold text-slate-900">Your Score</span>
              <span className="font-semibold text-slate-700">Rank #1 Topper</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Percentage:</span>
              <span className="font-semibold text-blue-700">{result.percentage}%</span>
              <span className="font-semibold text-slate-800">{topper.percentage}%</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Time Taken:</span>
              <span className="font-semibold text-blue-700">{Math.floor(result.timeSpentSeconds / 60)}m {result.timeSpentSeconds % 60}s</span>
              <span className="font-semibold text-slate-800">{Math.floor(topper.timeSpentSeconds / 60)}m {topper.timeSpentSeconds % 60}s</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-600">Percentile Rank:</span>
              <span className="font-semibold text-emerald-700">{percentileRank}th</span>
              <span className="font-semibold text-slate-800">99.9th</span>
            </div>
          </div>
        </div>

        {/* Syllabus Weak-Topic Radar */}
        <div className="portal-card p-5 bg-white border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs sm:text-sm">
            <Target className="w-4 h-4 text-rose-600" />
            <span>Syllabus Weak-Topic Diagnostic</span>
          </div>

          {weakTopics.length === 0 ? (
            <div className="p-3.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              Excellent mastery! All syllabus modules achieved over 60% accuracy.
            </div>
          ) : (
            <div className="space-y-1.5">
              {weakTopics.map(([tName, stat]) => {
                const acc = Math.round((stat.correct / stat.total) * 100);
                return (
                  <div key={tName} className="p-2.5 rounded bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900 truncate max-w-[180px]">{tName}</span>
                    <span className="font-mono font-semibold text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-300">
                      {acc}% ({stat.correct}/{stat.total})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Question-by-Question Audit & Explanations */}
      <div className="space-y-4">

        {/* Filter Strip */}
        <div className="portal-card p-3.5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Question-by-Question Audit & Explanations</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
              <span className="text-xs text-slate-400 px-1 flex items-center">
                <Languages className="w-3.5 h-3.5 text-slate-500" />
              </span>
              <button
                onClick={() => setLanguageMode('dual')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${languageMode === 'dual'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Dual Mode
              </button>
              <button
                onClick={() => setLanguageMode('en')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${languageMode === 'en'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguageMode('hi')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${languageMode === 'hi'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
              {(['all', 'correct', 'wrong', 'skipped'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${filterType === f
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Question Audit List */}
        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => {
            const uAns = result.userAnswers[q.id];
            const isSkipped = !isQuestionAnswered(q, uAns);
            const isCorrect = !isSkipped && isQuestionCorrect(q, uAns);
            const selectedOptId = uAns ? uAns.selectedOptionId : null;
            const selectedOptIds = uAns?.selectedOptionIds || [];

            return (
              <div
                key={q.id}
                className="portal-card p-5 bg-white border border-slate-200 space-y-3.5"
              >
                {/* Question Status Bar */}
                <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200">
                      Q.{idx + 1}
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${isSkipped
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : isCorrect
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border border-rose-300'
                      }`}>
                      {isSkipped ? 'Unattempted' : isCorrect ? 'Correct Response' : 'Incorrect Response'}
                    </span>
                  </div>

                  <AudioPlayerButton textToRead={q.questionEnglish || q.questionText} />
                </div>

                {/* Question Content */}
                <div>{renderQuestionText(q)}</div>

                {/* Question Image */}
                {q.imageUrl && (
                  <div className="my-2 rounded border border-slate-200 bg-slate-50 p-2 max-w-lg">
                    <img src={q.imageUrl} alt={`Question ${idx + 1} Diagram`} className="w-full object-contain max-h-72 rounded" />
                  </div>
                )}

                {/* Match the Following List I vs List II Box */}
                {q.questionType === 'match_following' && (q.listI || q.listII) && (
                  <div className="my-2.5 p-3.5 rounded bg-slate-50 border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {q.listI && q.listI.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-slate-800 font-bold block border-b border-slate-200 pb-1 font-mono uppercase">
                            List I
                          </span>
                          {q.listI.map((item, itemIdx) => {
                            if (!item) return null;
                            const hindiItem = autoHindiMap[q.id]?.listI?.[itemIdx];
                            return (
                              <div key={itemIdx} className="p-2 rounded bg-white border border-slate-200 font-medium text-slate-800">
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

                      {q.listII && q.listII.some(Boolean) && (
                        <div className="space-y-1.5">
                          <span className="text-slate-800 font-bold block border-b border-slate-200 pb-1 font-mono uppercase">
                            List II
                          </span>
                          {q.listII.map((item, itemIdx) => {
                            if (!item) return null;
                            const hindiItem = autoHindiMap[q.id]?.listII?.[itemIdx];
                            return (
                              <div key={itemIdx} className="p-2 rounded bg-white border border-slate-200 font-medium text-slate-800">
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

                {/* Option Choices Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const isMSQq = q.questionType === 'multiple_select';
                    const isCandidateChoice = isMSQq
                      ? selectedOptIds.includes(opt.id)
                      : selectedOptId === opt.id;
                    const correctIds = q.correctOptionIds || [q.correctOptionId];
                    const isRightAnswer = correctIds.includes(opt.id);
                    const hindiOptText = autoHindiMap[q.id]?.options?.[opt.id];

                    let optStyle = 'bg-slate-50 border-slate-200 text-slate-700';

                    if (isRightAnswer) {
                      optStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-medium';
                    } else if (isCandidateChoice && !isRightAnswer) {
                      optStyle = 'bg-rose-50 border-rose-300 text-rose-950';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded border flex items-center justify-between text-xs transition-colors ${optStyle}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-5 h-5 rounded font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 ${isRightAnswer
                              ? 'bg-emerald-600 text-white'
                              : isCandidateChoice
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                            {opt.id}
                          </span>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">
                              {languageMode === 'hi' && hindiOptText ? hindiOptText : opt.text}
                            </span>
                            {languageMode === 'dual' && hindiOptText && hindiOptText !== opt.text && (
                              <span className="text-[11px] text-slate-500 pt-0.5">
                                {hindiOptText}
                              </span>
                            )}
                          </div>
                        </div>

                        {isCandidateChoice && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 flex-shrink-0">
                            Candidate Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Standard Answer Key & Explanation:</span>
                  </span>
                  <div className="text-slate-700 leading-relaxed space-y-1">
                    {(() => {
                      const defaultExp = `Option (${q.correctOptionId}): "${q.options.find(o => o.id === q.correctOptionId)?.text || ''}" is the correct answer according to standard key.`;
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
                            <p className="text-slate-600 pt-1 border-t border-slate-200">
                              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded mr-1">HI</span>
                              {hindiExp}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 5. Question Discussion & Doubts Forum */}
                <QuestionDiscussion
                  quizId={quiz.id}
                  questionId={q.id}
                  questionNumber={idx + 1}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Verifiable Certificate Modal */}
      {showCertModal && (
        <CertificateModal
          result={result}
          onClose={() => setShowCertModal(false)}
        />
      )}
    </div>
  );
};
