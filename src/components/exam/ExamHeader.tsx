import React from 'react';
import { Clock, Send, Languages, Layers } from 'lucide-react';

interface ExamHeaderProps {
  topic: string;
  title: string;
  languageMode: 'dual' | 'en' | 'hi';
  setLanguageMode: (mode: 'dual' | 'en' | 'hi') => void;
  examViewMode: 'single' | 'all';
  setExamViewMode: (mode: 'single' | 'all') => void;
  questionViewMode?: 'both' | 'single_only' | 'all_only';
  timingMode?: 'quiz' | 'sectional' | 'question';
  timeRemainingSeconds: number;
  questionTimeRemainingSeconds?: number;
  sectionTimeRemainingSeconds?: number;
  currentSectionName?: string;
  onOpenSubmitModal: () => void;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  topic,
  title,
  languageMode,
  setLanguageMode,
  examViewMode,
  setExamViewMode,
  questionViewMode = 'both',
  timingMode,
  timeRemainingSeconds,
  questionTimeRemainingSeconds,
  sectionTimeRemainingSeconds,
  currentSectionName,
  onOpenSubmitModal,
}) => {
  const isLowTime = timeRemainingSeconds < 120;
  const isLowQTime = (questionTimeRemainingSeconds ?? 99) < 10;
  const isLowSecTime = (sectionTimeRemainingSeconds ?? 999) < 60;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="portal-card p-3.5 sm:p-4 bg-white border border-slate-200 sticky top-16 z-30 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">

      {/* Subject Badge & Paper Title */}
      <div className="flex items-center space-x-2.5 w-full md:w-auto">
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200 flex-shrink-0">
          {topic}
        </span>
        <h2 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
          {title}
        </h2>
      </div>

      {/* Action Controls & Real-Time Countdown Strip */}
      <div className="flex flex-wrap items-center justify-between md:justify-end w-full md:w-auto gap-2">

        {/* Language Mode Switcher */}
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
            Dual (En+Hi)
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

        {/* View Mode Layout Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
          {(questionViewMode === 'both' || questionViewMode === 'single_only') && (
            <button
              onClick={() => setExamViewMode('single')}
              disabled={questionViewMode === 'single_only'}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-colors ${examViewMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Layers className="w-3 h-3 text-slate-500" />
              <span>Single</span>
            </button>
          )}

          {(questionViewMode === 'both' || questionViewMode === 'all_only') && (
            <button
              onClick={() => setExamViewMode('all')}
              disabled={questionViewMode === 'all_only'}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-colors ${examViewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Layers className="w-3 h-3 text-slate-500" />
              <span>All Grid</span>
            </button>
          )}
        </div>

        {/* Precision Examination Countdown Timers */}
        {timingMode === 'question' && questionTimeRemainingSeconds !== undefined ? (
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-xs font-semibold border tabular-nums ${isLowQTime
              ? 'timer-critical-pulse'
              : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
            <Clock className={`w-3.5 h-3.5 ${isLowQTime ? 'text-rose-600' : 'text-slate-500'}`} />
            <span>Q Time: {formatTime(questionTimeRemainingSeconds)}</span>
          </div>
        ) : timingMode === 'sectional' && sectionTimeRemainingSeconds !== undefined ? (
          <div className="flex items-center space-x-1.5">
            {currentSectionName && (
              <span className="hidden lg:block text-[10px] font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded max-w-[120px] truncate">
                {currentSectionName}
              </span>
            )}
            <div className={`flex items-center space-x-1 px-2 py-1 rounded font-mono text-xs font-semibold border tabular-nums ${isLowSecTime
                ? 'timer-critical-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Section: {formatTime(sectionTimeRemainingSeconds)}</span>
            </div>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded font-mono text-xs font-semibold border tabular-nums ${isLowTime ? 'timer-critical-pulse' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Total: {formatTime(timeRemainingSeconds)}</span>
            </div>
          </div>
        ) : (
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-xs font-semibold border tabular-nums ${isLowTime
              ? 'timer-critical-pulse'
              : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
            <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-600' : 'text-slate-500'}`} />
            <span>Time Left: {formatTime(timeRemainingSeconds)}</span>
          </div>
        )}

        {/* Submit Exam Button */}
        <button
          onClick={onOpenSubmitModal}
          className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
        >
          <Send className="w-3 h-3" />
          <span>Submit</span>
        </button>
      </div>

    </div>
  );
};
