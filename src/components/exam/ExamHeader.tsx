import React from 'react';
import { Clock, Send, Languages, Layers, LayoutGrid, LogOut } from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import { getQuizTypeDescriptor } from '../../utils/badgeHelper';

interface ExamHeaderProps {
  quiz?: Partial<Quiz> | null;
  quizType?: 'practice' | 'live_contest' | 'scheduled_unlock' | 'unranked_practice';
  maxAttempts?: number;
  topic: string;
  title: string;
  languageMode: 'dual' | 'en' | 'hi';
  setLanguageMode: (mode: 'dual' | 'en' | 'hi') => void;
  examViewMode: 'single' | 'all';
  setExamViewMode: (mode: 'single' | 'all') => void;
  questionViewMode?: 'both' | 'single_only' | 'all_only';
  timingMode?: 'quiz' | 'sectional' | 'question';
  isUntimed?: boolean;
  timeRemainingSeconds: number;
  questionTimeRemainingSeconds?: number;
  sectionTimeRemainingSeconds?: number;
  currentSectionName?: string;
  answeredCount?: number;
  totalQuestions?: number;
  onToggleMobilePalette?: () => void;
  onOpenSubmitModal: () => void;
  onOpenExitModal?: () => void;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  quiz,
  quizType,
  maxAttempts,
  topic,
  title,
  languageMode,
  setLanguageMode,
  examViewMode,
  setExamViewMode,
  questionViewMode = 'both',
  timingMode,
  isUntimed = false,
  timeRemainingSeconds,
  questionTimeRemainingSeconds,
  sectionTimeRemainingSeconds,
  currentSectionName,
  answeredCount,
  totalQuestions,
  onToggleMobilePalette,
  onOpenSubmitModal,
  onOpenExitModal,
}) => {
  const typeInfo = getQuizTypeDescriptor(quiz || { topic, title, quizType, maxAttempts });

  const isLowTime = timeRemainingSeconds < 120;
  const isLowQTime = (questionTimeRemainingSeconds ?? 99) < 10;
  const isLowSecTime = (sectionTimeRemainingSeconds ?? 999) < 60;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderTimerBlock = (isMobile = false) => {
    if (isUntimed) {
      return (
        <div
          className={`flex items-center gap-1 rounded-lg font-mono font-bold border bg-indigo-50 border-indigo-200 text-indigo-700 tabular-nums shadow-2xs ${
            isMobile ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
          }`}
          title="Untimed Practice Exam (Elapsed Time)"
        >
          <Clock className={`animate-spin ${isMobile ? 'w-3 h-3 text-indigo-600' : 'w-3.5 h-3.5 text-indigo-600'}`} style={{ animationDuration: '8s' }} />
          {!isMobile && <span className="hidden sm:inline text-[10px] uppercase font-semibold text-indigo-500">Elapsed:</span>}
          <span>{formatTime(timeRemainingSeconds)}</span>
        </div>
      );
    }

    if (timingMode === 'question' && questionTimeRemainingSeconds !== undefined) {
      return (
        <div
          className={`flex items-center gap-1 rounded-lg font-mono font-semibold border tabular-nums ${
            isMobile ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
          } ${
            isLowQTime ? 'timer-critical-pulse' : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <Clock className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isLowQTime ? 'text-rose-600' : 'text-slate-500'}`} />
          <span>{formatTime(questionTimeRemainingSeconds)}</span>
        </div>
      );
    }

    if (timingMode === 'sectional' && sectionTimeRemainingSeconds !== undefined) {
      return (
        <div className="flex items-center gap-1">
          {currentSectionName && !isMobile && (
            <span className="hidden xl:block text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md max-w-[110px] truncate">
              {currentSectionName}
            </span>
          )}
          <div
            className={`flex items-center gap-1 rounded-lg font-mono font-semibold border tabular-nums ${
              isMobile ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
            } ${
              isLowSecTime ? 'timer-critical-pulse' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
            title="Section Time Remaining"
          >
            <Clock className={isMobile ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-500'} />
            <span>{formatTime(sectionTimeRemainingSeconds)}</span>
          </div>
          {!isMobile && (
            <div
              className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-semibold border tabular-nums ${
                isLowTime ? 'timer-critical-pulse' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
              title="Total Exam Time Remaining"
            >
              <span>{formatTime(timeRemainingSeconds)}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-1 rounded-lg font-mono font-semibold border tabular-nums ${
          isMobile ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
        } ${
          isLowTime ? 'timer-critical-pulse' : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}
      >
        <Clock className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isLowTime ? 'text-rose-600' : 'text-slate-500'}`} />
        <span>{formatTime(timeRemainingSeconds)}</span>
      </div>
    );
  };

  return (
    <div className="sticky top-0 z-30 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      {/* ===== DESKTOP / TABLET SPACIOUS HEADER (md and above) ===== */}
      <div className="hidden md:flex max-w-7xl mx-auto min-h-[3.75rem] py-1.5 items-center justify-between gap-4">
        {/* Left: Subject Code, Paper Title & Quiz Type Under Heading */}
        <div className="flex flex-col justify-center min-w-0 flex-1 py-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200 shrink-0">
              {topic}
            </span>
            <h2 className="font-bold text-slate-900 text-sm truncate" title={title}>
              {title}
            </h2>
            <span className={`inline-flex items-center font-mono font-bold tracking-wider uppercase border text-[10px] px-1.5 py-0.2 rounded shadow-2xs shrink-0 select-none ${typeInfo.badgeColorClass}`}>
              {typeInfo.shortBadge}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${typeInfo.dotColorClass}`} />
              {typeInfo.label}
            </span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{isUntimed ? 'Untimed Practice' : (timingMode === 'sectional' ? 'Sectional Timing' : `${Math.max(1, Math.round(timeRemainingSeconds / 60))}m Timer`)}</span>
            {maxAttempts && maxAttempts > 0 ? (
              <>
                <span className="text-slate-300">•</span>
                <span>Max {maxAttempts} Attempts</span>
              </>
            ) : (
              <>
                <span className="text-slate-300">•</span>
                <span>Unlimited Practice</span>
              </>
            )}
          </div>
        </div>

        {/* Right Desktop Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop Language Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
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

          {/* Desktop View Switcher */}
          {(questionViewMode === 'both' || questionViewMode === 'single_only' || questionViewMode === 'all_only') && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
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
            </div>
          )}

          {/* Desktop Timer */}
          {renderTimerBlock(false)}

          {/* Desktop Exit Button */}
          {onOpenExitModal && (
            <button
              type="button"
              onClick={onOpenExitModal}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title="Exit Exam"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Exit</span>
            </button>
          )}

          {/* Desktop Submit Button */}
          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* ===== MOBILE OPTIMIZED DEDICATED 2-ROW HEADER (< md) ===== */}
      <div className="md:hidden py-1.5 space-y-1.5">
        {/* Row 1: Exit Button + Title + Timer + Submit */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {onOpenExitModal && (
              <button
                type="button"
                onClick={onOpenExitModal}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 shrink-0 cursor-pointer"
                title="Exit Exam"
                aria-label="Exit Exam"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
              </button>
            )}
            <h2 className="font-bold text-slate-900 text-xs truncate leading-snug" title={title}>
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mobile Timer Pill */}
            {renderTimerBlock(true)}

            {/* Mobile Submit Button */}
            <button
              type="button"
              onClick={onOpenSubmitModal}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3 h-3" />
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Row 2: Quiz Type Details + Inline Language Toggle + Palette */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
          {/* Left: Quiz Type Badge + Label */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <span className={`inline-flex items-center font-mono font-bold tracking-wider uppercase border text-[9.5px] px-1.5 py-0.2 rounded shadow-2xs shrink-0 select-none ${typeInfo.badgeColorClass}`}>
              {typeInfo.shortBadge}
            </span>
            <span className="font-medium text-slate-600 truncate text-[11px]">
              {typeInfo.label}
            </span>
          </div>

          {/* Right: Direct Mini Language Toggle + Palette Trigger (Zero popover required!) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Inline Mini Language Switcher on Mobile */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 font-semibold text-[10px]">
              {(['dual', 'en', 'hi'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLanguageMode(mode)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    languageMode === mode
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {mode === 'dual' ? 'Dual' : mode === 'en' ? 'EN' : 'हिन्दी'}
                </button>
              ))}
            </div>

            {/* View Mode Toggle on Mobile (Only if exam allows switching) */}
            {questionViewMode === 'both' && (
              <button
                type="button"
                onClick={() => setExamViewMode(examViewMode === 'single' ? 'all' : 'single')}
                className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[10px] flex items-center gap-0.5 cursor-pointer shrink-0"
                title={examViewMode === 'single' ? 'Switch to All Questions View' : 'Switch to Single Question View'}
              >
                <Layers className="w-2.5 h-2.5 text-slate-500" />
                <span>{examViewMode === 'single' ? '1Q' : 'All'}</span>
              </button>
            )}

            {/* Palette Drawer Trigger */}
            {onToggleMobilePalette && examViewMode === 'single' && (
              <button
                type="button"
                onClick={onToggleMobilePalette}
                className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-mono font-bold text-[10.5px] flex items-center gap-1 cursor-pointer tabular-nums shrink-0"
                title="Question Palette"
              >
                <LayoutGrid className="w-3 h-3 text-blue-600" />
                <span>{answeredCount ?? 0}/{totalQuestions ?? 0}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
