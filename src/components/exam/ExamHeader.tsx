import React, { useState, useRef, useEffect } from 'react';
import { Clock, Send, Languages, Layers, SlidersHorizontal, LayoutGrid } from 'lucide-react';

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
  answeredCount?: number;
  totalQuestions?: number;
  onToggleMobilePalette?: () => void;
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
  answeredCount,
  totalQuestions,
  onToggleMobilePalette,
  onOpenSubmitModal,
}) => {
  const [showMobileControls, setShowMobileControls] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isLowTime = timeRemainingSeconds < 120;
  const isLowQTime = (questionTimeRemainingSeconds ?? 99) < 10;
  const isLowSecTime = (sectionTimeRemainingSeconds ?? 999) < 60;

  useEffect(() => {
    if (!showMobileControls) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowMobileControls(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMobileControls(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showMobileControls]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="sticky top-0 z-30 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Subject Code & Paper Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200 shrink-0">
            {topic}
          </span>
          <h2 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
            {title}
          </h2>
        </div>

        {/* Right: Controls, Timer, Palette & Submit */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Language Mode Switcher */}
          <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 px-1.5 flex items-center" title="Language">
              <Languages className="w-3.5 h-3.5 text-slate-500" />
            </span>
            <button
              type="button"
              onClick={() => setLanguageMode('dual')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                languageMode === 'dual'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dual
            </button>
            <button
              type="button"
              onClick={() => setLanguageMode('en')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                languageMode === 'en'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguageMode('hi')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                languageMode === 'hi'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Desktop View Mode Switcher */}
          <div className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(questionViewMode === 'both' || questionViewMode === 'single_only') && (
              <button
                type="button"
                onClick={() => setExamViewMode('single')}
                disabled={questionViewMode === 'single_only'}
                className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  examViewMode === 'single'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3 text-slate-500" />
                <span>Single</span>
              </button>
            )}

            {(questionViewMode === 'both' || questionViewMode === 'all_only') && (
              <button
                type="button"
                onClick={() => setExamViewMode('all')}
                disabled={questionViewMode === 'all_only'}
                className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  examViewMode === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3 text-slate-500" />
                <span>All</span>
              </button>
            )}
          </div>

          {/* Mobile / Tablet Compact Controls Popover (Language + View Mode) */}
          <div className="relative lg:hidden" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowMobileControls((prev) => !prev)}
              className={`p-1.5 sm:px-2 sm:py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                showMobileControls
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Display & Language Options"
              aria-label="Display and language options"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View</span>
            </button>

            {showMobileControls && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-3 z-50">
                <div className="space-y-1.5 md:hidden">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Question Language
                  </p>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['dual', 'en', 'hi'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setLanguageMode(mode);
                          setShowMobileControls(false);
                        }}
                        className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          languageMode === mode
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        {mode === 'dual' ? 'Dual' : mode === 'en' ? 'English' : 'हिन्दी'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Layout Mode
                  </p>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                    {(questionViewMode === 'both' || questionViewMode === 'single_only') && (
                      <button
                        type="button"
                        onClick={() => {
                          setExamViewMode('single');
                          setShowMobileControls(false);
                        }}
                        disabled={questionViewMode === 'single_only'}
                        className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          examViewMode === 'single'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Single Q
                      </button>
                    )}
                    {(questionViewMode === 'both' || questionViewMode === 'all_only') && (
                      <button
                        type="button"
                        onClick={() => {
                          setExamViewMode('all');
                          setShowMobileControls(false);
                        }}
                        disabled={questionViewMode === 'all_only'}
                        className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          examViewMode === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        All Questions
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile/Tablet Question Palette Drawer Trigger */}
          {onToggleMobilePalette && examViewMode === 'single' && (
            <button
              type="button"
              onClick={onToggleMobilePalette}
              className="lg:hidden px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer tabular-nums"
              title="Open Question Palette"
              aria-label="Open Question Palette"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              {typeof answeredCount === 'number' && typeof totalQuestions === 'number' && (
                <span className="text-[11px]">
                  {answeredCount}/{totalQuestions}
                </span>
              )}
            </button>
          )}

          {/* Countdown Timer Pill */}
          {timingMode === 'question' && questionTimeRemainingSeconds !== undefined ? (
            <div
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg font-mono text-xs font-semibold border tabular-nums ${
                isLowQTime
                  ? 'timer-critical-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isLowQTime ? 'text-rose-600' : 'text-slate-500'}`} />
              <span>{formatTime(questionTimeRemainingSeconds)}</span>
            </div>
          ) : timingMode === 'sectional' && sectionTimeRemainingSeconds !== undefined ? (
            <div className="flex items-center gap-1">
              {currentSectionName && (
                <span className="hidden xl:block text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md max-w-[110px] truncate">
                  {currentSectionName}
                </span>
              )}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-semibold border tabular-nums ${
                  isLowSecTime
                    ? 'timer-critical-pulse'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
                title="Section Time Remaining"
              >
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatTime(sectionTimeRemainingSeconds)}</span>
              </div>
              <div
                className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-semibold border tabular-nums ${
                  isLowTime
                    ? 'timer-critical-pulse'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
                title="Total Exam Time Remaining"
              >
                <span>{formatTime(timeRemainingSeconds)}</span>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg font-mono text-xs font-semibold border tabular-nums ${
                isLowTime
                  ? 'timer-critical-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-600' : 'text-slate-500'}`} />
              <span>{formatTime(timeRemainingSeconds)}</span>
            </div>
          )}

          {/* Submit Exam Button */}
          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
