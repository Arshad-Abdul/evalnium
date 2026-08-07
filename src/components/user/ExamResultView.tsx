import React, { useEffect, useState } from 'react';
import type { QuizAttemptResult, Quiz, Question } from '../../types/quiz';
import confetti from 'canvas-confetti';
import { Trophy, AlertCircle, RotateCcw, Home, HelpCircle, BookOpen, Languages } from 'lucide-react';

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

  useEffect(() => {
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

  const filteredQuestions = quiz.questions.filter((q) => {
    const uAns = result.userAnswers[q.id];
    const isSelected = uAns && uAns.selectedOptionId !== null;
    const isCorrect = isSelected && uAns.selectedOptionId === q.correctOptionId;

    if (filterType === 'correct') return isCorrect;
    if (filterType === 'wrong') return isSelected && !isCorrect;
    if (filterType === 'skipped') return !isSelected;
    return true;
  });

  const renderQuestionText = (q: Question) => {
    if (languageMode === 'en' && q.questionEnglish) {
      return <h4 className="text-base font-bold text-slate-900">{q.questionEnglish}</h4>;
    }
    if (languageMode === 'hi' && q.questionHindi) {
      return <h4 className="text-base font-bold text-slate-900">{q.questionHindi}</h4>;
    }
    if (languageMode === 'dual' && (q.questionEnglish || q.questionHindi)) {
      return (
        <div className="space-y-1.5">
          {q.questionEnglish && (
            <div className="text-base font-bold text-slate-900">
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mr-2">EN</span>
              {q.questionEnglish}
            </div>
          )}
          {q.questionHindi && (
            <div className="text-base font-bold text-slate-800">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2">HI</span>
              {q.questionHindi}
            </div>
          )}
        </div>
      );
    }

    return <h4 className="text-base font-bold text-slate-900 whitespace-pre-line">{q.questionText}</h4>;
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
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase mb-2 ${
              result.passed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {result.passed ? 'EXAM PASSED 🎉' : 'NEEDS IMPROVEMENT 📚'}
            </span>

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
            <button
              onClick={onRetake}
              className="w-1/2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <RotateCcw className="w-4 h-4 text-indigo-600" />
              <span>Retake Exam</span>
            </button>

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

      {/* Answer Key & Explanations Review Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Detailed Question & Answer Review</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Review option choices and rationale explanations</p>
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
            const selectedOptId = uAns ? uAns.selectedOptionId : null;
            const isCorrect = selectedOptId === q.correctOptionId;
            const isSkipped = selectedOptId === null;

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
                </div>

                {renderQuestionText(q)}

                {/* Options Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt) => {
                    const isCandidateChoice = selectedOptId === opt.id;
                    const isRightAnswer = q.correctOptionId === opt.id;

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
                        <div className="flex items-center space-x-2">
                          <span className={`w-6 h-6 rounded-md font-mono font-bold flex items-center justify-center ${
                            isRightAnswer
                              ? 'bg-emerald-600 text-white'
                              : isCandidateChoice
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>

                        {isCandidateChoice && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-700">
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
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {q.explanation || `Option (${q.correctOptionId}): "${q.options.find(o => o.id === q.correctOptionId)?.text || ''}" is the correct answer.`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
