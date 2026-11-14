import React, { useState, useEffect } from 'react';
import type { Announcement, AnnouncementCategory } from '../../types/announcement';
import { 
  Megaphone, Calendar, Clock, ArrowRight, Timer, 
  AlertTriangle, Info, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface AnnouncementBannerProps {
  announcements: Announcement[];
  onSelectQuizById?: (quizId: string) => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcements,
  onSelectQuizById
}) => {
  const activeAnnouncements = announcements.filter(a => a.isActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [now, setNow] = useState<number>(Date.now());

  // 1-second live heartbeat for real-time countdown clocks
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto carousel cycling if multiple active bulletins exist
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [activeAnnouncements.length]);

  if (activeAnnouncements.length === 0) return null;

  // Safe index bounds
  const current = activeAnnouncements[currentIndex % activeAnnouncements.length] || activeAnnouncements[0];
  const scheduledDate = new Date(current.scheduledDateTime);
  const diffMs = scheduledDate.getTime() - now;
  const isFuture = diffMs > 0;
  const isExam = current.category === 'exam';

  // Countdown calculations
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  const getCategoryTheme = (cat?: AnnouncementCategory) => {
    switch (cat) {
      case 'exam':
        return {
          label: isFuture ? 'Exam Notice' : 'Exam Live',
          borderLeft: 'border-l-amber-500',
          badge: 'bg-amber-50 text-amber-800 border-amber-300',
          iconBox: 'bg-amber-50 border-amber-200 text-amber-700',
          icon: isFuture ? Timer : Megaphone,
        };
      case 'notice':
        return {
          label: 'Official Notice',
          borderLeft: 'border-l-purple-500',
          badge: 'bg-purple-50 text-purple-800 border-purple-300',
          iconBox: 'bg-purple-50 border-purple-200 text-purple-700',
          icon: Info,
        };
      case 'alert':
        return {
          label: 'Urgent Alert',
          borderLeft: 'border-l-rose-500',
          badge: 'bg-rose-50 text-rose-800 border-rose-300',
          iconBox: 'bg-rose-50 border-rose-200 text-rose-700',
          icon: AlertTriangle,
        };
      case 'bulletin':
      default:
        return {
          label: 'Bulletin',
          borderLeft: 'border-l-indigo-500',
          badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          iconBox: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          icon: Megaphone,
        };
    }
  };

  const theme = getCategoryTheme(current.category);
  const CategoryIcon = theme.icon;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
  };

  return (
    <div className={`portal-card border-l-4 ${theme.borderLeft} p-3.5 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-xs transition-all`}>
      
      {/* Left Column: Icon & Content */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${theme.iconBox}`}>
          <CategoryIcon className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Badge */}
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider ${theme.badge}`}>
              {theme.label}
            </span>

            {/* Countdown Clock (when scheduled in future and timer enabled) */}
            {current.showTimer && isFuture && (
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-900 font-mono text-[11px] font-bold shadow-2xs">
                <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[10px] text-amber-700 uppercase font-semibold">Starts in:</span>
                <span className="font-black text-amber-950">
                  {days > 0 ? `${days}d ` : ''}{pad(hours)}h : {pad(minutes)}m : {pad(seconds)}s
                </span>
              </div>
            )}

            {/* Exam Live Indicator */}
            {isExam && !isFuture && (
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 font-mono text-[11px] font-black animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>EXAM LIVE NOW</span>
              </div>
            )}

            {/* Carousel navigation counter */}
            {activeAnnouncements.length > 1 && (
              <div className="flex items-center space-x-1 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                <span>{currentIndex + 1} / {activeAnnouncements.length}</span>
                <div className="flex items-center ml-1 space-x-0.5">
                  <button onClick={handlePrev} className="hover:text-slate-900 p-0.5 cursor-pointer" title="Previous notice">
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button onClick={handleNext} className="hover:text-slate-900 p-0.5 cursor-pointer" title="Next notice">
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            <h4 className="font-extrabold text-sm text-slate-900 truncate">
              {current.title}
            </h4>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {current.message}
          </p>
        </div>
      </div>

      {/* Right Column: Time stamp & Action Button */}
      <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
        
        {/* Date / Time */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1 text-slate-700 font-bold">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{scheduledDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>

        {/* Action Button if linked to a quiz */}
        {current.targetQuizId && onSelectQuizById && (
          <button
            type="button"
            onClick={() => onSelectQuizById(current.targetQuizId!)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs ${
              isExam && !isFuture
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <span>{isExam && !isFuture ? 'Attempt Exam Now' : 'Open Exam'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
