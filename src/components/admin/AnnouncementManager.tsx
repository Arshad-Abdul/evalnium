import React, { useState } from 'react';
import type { Announcement } from '../../types/announcement';
import type { Quiz } from '../../types/quiz';
import { Megaphone, Plus, Trash2, Calendar, Clock, CheckCircle } from 'lucide-react';

interface AnnouncementManagerProps {
  announcements: Announcement[];
  quizzes: Quiz[];
  onSaveAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({
  announcements,
  quizzes,
  onSaveAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [targetQuizId, setTargetQuizId] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    const newAnnouncement: Announcement = {
      id: `ann_${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      scheduledDateTime: scheduledDateTime || new Date().toISOString(),
      targetQuizId: targetQuizId || undefined,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    onSaveAnnouncement(newAnnouncement);
    setSuccessMsg('Live exam notice scheduled successfully!');
    setTitle('');
    setMessage('');
    setScheduledDateTime('');
    setTargetQuizId('');

    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-amber-500" />
            <span>Scheduled Exam Announcement Tickers</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Schedule live notice banners with start date & time displayed across candidate portal.
          </p>
        </div>
      </div>

      {/* Schedule Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Create & Schedule New Notice</h3>

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Notice Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UGC NET 2026 Special Mock Series"
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Scheduled Date & Start Time</label>
            <input
              type="datetime-local"
              required
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">Announcement Description / Details</label>
          <textarea
            rows={2}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Test series starts on Monday 10:00 AM. 100 bilingual questions with negative marking."
            className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">Link to Exam (Optional)</label>
          <select
            value={targetQuizId}
            onChange={(e) => setTargetQuizId(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
          >
            <option value="">-- No Direct Link --</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({q.topic})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Scheduled Announcement</span>
          </button>
        </div>
      </form>

      {/* Announcements List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900">
          Active Scheduled Tickers ({announcements.length})
        </div>

        {announcements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">
            No scheduled announcements created yet. Fill the form above to add a live ticker.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{ann.title}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium">{ann.message}</p>
                  <p className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
                    <span className="flex items-center space-x-1"><Calendar className="w-3 h-3" /> <span>{new Date(ann.scheduledDateTime).toLocaleDateString()}</span></span>
                    <span className="flex items-center space-x-1"><Clock className="w-3 h-3" /> <span>{new Date(ann.scheduledDateTime).toLocaleTimeString()}</span></span>
                  </p>
                </div>

                <button
                  onClick={() => onDeleteAnnouncement(ann.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
