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
    <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-amber-500 text-slate-900 font-bold flex-shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
              {isUpcoming ? 'SCHEDULED EXAM NOTICE' : 'LIVE ANNOUNCEMENT'}
            </span>
            <h4 className="font-bold text-sm text-white">{current.title}</h4>
          </div>
          <p className="text-xs text-slate-300 font-medium">{current.message}</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 flex-shrink-0">
        <div className="text-right text-xs font-mono text-slate-400 hidden md:block">
          <span className="flex items-center space-x-1 text-amber-400 font-bold">
            <Calendar className="w-3.5 h-3.5" />
            <span>{scheduledDate.toLocaleDateString()}</span>
          </span>
          <span className="flex items-center space-x-1 text-[11px]">
            <Clock className="w-3 h-3" />
            <span>{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>

        {current.targetQuizId && onSelectQuizById && (
          <button
            onClick={() => onSelectQuizById(current.targetQuizId!)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <span>Open Exam</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
