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
    <div className="bg-gradient-to-r from-amber-50/95 via-orange-50/40 to-amber-50/80 text-slate-800 p-3.5 sm:p-4 rounded-2xl border border-amber-200/90 shadow-2xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
      <div className="flex items-center space-x-3 w-full sm:w-auto">
        <div className="p-2.5 rounded-xl bg-amber-500 text-white font-bold flex-shrink-0 shadow-xs ring-4 ring-amber-100/80">
          <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300/80 text-[10px] font-mono font-bold uppercase tracking-wider">
              {isUpcoming ? 'SCHEDULED EXAM NOTICE' : 'LIVE BULLETIN'}
            </span>
            {activeAnnouncements.length > 1 && (
              <span className="text-[10px] font-mono text-amber-800/80 bg-amber-100/70 px-1.5 py-0.2 rounded font-semibold">
                {currentIndex + 1}/{activeAnnouncements.length}
              </span>
            )}
            <h4 className="font-bold text-sm text-slate-900 truncate">{current.title}</h4>
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">{current.message}</p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/50">
        <div className="text-left sm:text-right text-xs font-mono text-slate-500">
          <span className="flex items-center space-x-1 text-amber-900 font-semibold sm:justify-end">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>{scheduledDate.toLocaleDateString()}</span>
          </span>
          <span className="flex items-center space-x-1 text-[11px] text-slate-500 sm:justify-end">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>

        {current.targetQuizId && onSelectQuizById && (
          <button
            onClick={() => onSelectQuizById(current.targetQuizId!)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all hover:shadow-sm cursor-pointer"
          >
            <span>Open Exam</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
