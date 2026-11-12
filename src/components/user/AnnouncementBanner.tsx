import React, { useState, useEffect } from 'react';
import type { Announcement } from '../../types/announcement';
import { Megaphone, Calendar, Clock, ArrowRight } from 'lucide-react';

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

  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeAnnouncements.length]);

  if (activeAnnouncements.length === 0) return null;

  const current = activeAnnouncements[currentIndex];
  const scheduledDate = new Date(current.scheduledDateTime);
  const isUpcoming = scheduledDate > new Date();

  return (
    <div className="portal-card border-l-4 border-l-amber-500 p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-semibold uppercase tracking-wide">
              {isUpcoming ? 'Exam Notice' : 'Bulletin'}
            </span>
            {activeAnnouncements.length > 1 && (
              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                {currentIndex + 1}/{activeAnnouncements.length}
              </span>
            )}
            <h4 className="font-semibold text-sm text-slate-900 truncate">{current.title}</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{current.message}</p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1 text-slate-700 font-semibold">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{scheduledDate.toLocaleDateString()}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>

        {current.targetQuizId && onSelectQuizById && (
          <button
            type="button"
            onClick={() => onSelectQuizById(current.targetQuizId!)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Open Exam</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
