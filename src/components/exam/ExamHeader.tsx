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
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs sticky top-16 z-30 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
          {topic}
        </span>
        <h2 className="font-bold text-slate-900 text-base line-clamp-1">
          {title}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Language Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 px-1.5 flex items-center space-x-1">
            <Languages className="w-3.5 h-3.5 text-blue-600" />
          </span>
          <button
            onClick={() => setLanguageMode('dual')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              languageMode === 'dual'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dual (En+Hi)
          </button>
          <button
            onClick={() => setLanguageMode('en')}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              languageMode === 'en'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguageMode('hi')}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              languageMode === 'hi'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
        </div>

        {/* Exam View Layout Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(questionViewMode === 'both' || questionViewMode === 'single_only') && (
            <button
              onClick={() => setExamViewMode('single')}
              disabled={questionViewMode === 'single_only'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all ${
                examViewMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1 Question/Screen</span>
            </button>
          )}

          {(questionViewMode === 'both' || questionViewMode === 'all_only') && (
            <button
              onClick={() => setExamViewMode('all')}
              disabled={questionViewMode === 'all_only'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all ${
                examViewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Questions</span>
            </button>
          )}
        </div>

        {/* Countdown Timer Display */}
        {timingMode === 'question' && questionTimeRemainingSeconds !== undefined ? (
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
            isLowQTime
              ? 'bg-rose-50 border-rose-400 text-rose-700 animate-pulse'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isLowQTime ? 'text-rose-600' : 'text-amber-600'}`} />
            <span>Q Time: {formatTime(questionTimeRemainingSeconds)}</span>
          </div>
        ) : timingMode === 'sectional' && sectionTimeRemainingSeconds !== undefined ? (
          <div className="flex items-center space-x-2">
            {currentSectionName && (
              <span className="hidden sm:block text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-md max-w-[120px] truncate">
                {currentSectionName}
              </span>
            )}
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
              isLowSecTime
                ? 'bg-rose-50 border-rose-400 text-rose-700 animate-pulse'
                : (sectionTimeRemainingSeconds ?? 999) < 180
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-violet-50 border-violet-300 text-violet-800'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isLowSecTime ? 'text-rose-600' : 'text-violet-600'}`} />
              <span>Section: {formatTime(sectionTimeRemainingSeconds)}</span>
            </div>
            <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
              isLowTime ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <Clock className={`w-3 h-3 ${isLowTime ? 'text-rose-500' : 'text-slate-400'}`} />
              <span>Total: {formatTime(timeRemainingSeconds)}</span>
            </div>
          </div>
        ) : (
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
            isLowTime
              ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-600' : 'text-amber-600'}`} />
            <span>Time Left: {formatTime(timeRemainingSeconds)}</span>
          </div>
        )}

        <button
          onClick={onOpenSubmitModal}
          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Submit Exam</span>
        </button>
      </div>
    </div>
  );
};
