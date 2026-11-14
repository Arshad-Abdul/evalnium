import React, { useState } from 'react';
import type { Announcement, AnnouncementCategory } from '../../types/announcement';
import type { Quiz } from '../../types/quiz';
import { 
  Megaphone, Plus, Trash2, Calendar, Clock, CheckCircle, 
  Eye, EyeOff, AlertTriangle, Info, Bell, Timer, ExternalLink,
  Edit, X, Check
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

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
  const [category, setCategory] = useState<AnnouncementCategory>('bulletin');
  const [showTimer, setShowTimer] = useState(true);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [targetQuizId, setTargetQuizId] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'unpublished'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Edit State & Modal Handlers
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editCategory, setEditCategory] = useState<AnnouncementCategory>('bulletin');
  const [editShowTimer, setEditShowTimer] = useState(true);
  const [editScheduledDateTime, setEditScheduledDateTime] = useState('');
  const [editTargetQuizId, setEditTargetQuizId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const toDatetimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return '';
    }
  };

  const handleOpenEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setEditTitle(ann.title);
    setEditMessage(ann.message);
    setEditCategory(ann.category || 'bulletin');
    setEditShowTimer(ann.showTimer ?? true);
    setEditScheduledDateTime(toDatetimeLocal(ann.scheduledDateTime));
    setEditTargetQuizId(ann.targetQuizId || '');
    setEditIsActive(ann.isActive);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editTitle.trim() || !editMessage.trim()) return;

    const effectiveScheduleTime = editScheduledDateTime 
      ? new Date(editScheduledDateTime).toISOString() 
      : editingAnnouncement.scheduledDateTime;

    const updatedAnnouncement: Announcement = {
      ...editingAnnouncement,
      title: editTitle.trim(),
      message: editMessage.trim(),
      category: editCategory,
      showTimer: editCategory === 'exam' ? editShowTimer : (editScheduledDateTime ? editShowTimer : false),
      scheduledDateTime: effectiveScheduleTime,
      targetQuizId: editTargetQuizId || undefined,
      isActive: editIsActive,
    };

    onSaveAnnouncement(updatedAnnouncement);
    setEditingAnnouncement(null);
    setSuccessMsg(`✅ "${editTitle.trim()}" updated successfully!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    // For bulletins, if scheduledDateTime is empty, default to current timestamp
    const effectiveScheduleTime = scheduledDateTime 
      ? new Date(scheduledDateTime).toISOString() 
      : new Date().toISOString();

    const newAnnouncement: Announcement = {
      id: `ann_${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      category,
      showTimer: category === 'exam' ? showTimer : (scheduledDateTime ? showTimer : false),
      scheduledDateTime: effectiveScheduleTime,
      targetQuizId: targetQuizId || undefined,
      isActive: true, // Published by default
      createdAt: new Date().toISOString()
    };

    onSaveAnnouncement(newAnnouncement);
    setSuccessMsg(`✅ ${category === 'bulletin' ? 'Bulletin' : category === 'exam' ? 'Exam Notice' : 'Notice'} published successfully!`);
    setTitle('');
    setMessage('');
    setScheduledDateTime('');
    setTargetQuizId('');
    setShowTimer(true);

    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleToggleActive = (ann: Announcement) => {
    const nextState = !ann.isActive;
    onSaveAnnouncement({
      ...ann,
      isActive: nextState
    });
  };

  const activeCount = announcements.filter(a => a.isActive).length;
  const unpublishedCount = announcements.filter(a => !a.isActive).length;

  const filteredAnnouncements = announcements.filter(a => {
    if (filterTab === 'active' && !a.isActive) return false;
    if (filterTab === 'unpublished' && a.isActive) return false;
    if (filterCategory !== 'all' && (a.category || 'bulletin') !== filterCategory) return false;
    return true;
  });

  const getCategoryDetails = (cat?: AnnouncementCategory) => {
    switch (cat) {
      case 'exam':
        return {
          label: 'Exam Announcement',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <Timer className="w-3.5 h-3.5 text-amber-700" />,
          accent: 'border-l-amber-500'
        };
      case 'notice':
        return {
          label: 'Official Notice',
          badge: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: <Info className="w-3.5 h-3.5 text-purple-700" />,
          accent: 'border-l-purple-500'
        };
      case 'alert':
        return {
          label: 'Urgent Alert',
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />,
          accent: 'border-l-rose-500'
        };
      case 'bulletin':
      default:
        return {
          label: 'General Bulletin',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Megaphone className="w-3.5 h-3.5 text-blue-700" />,
          accent: 'border-l-blue-500'
        };
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <span>Portal Bulletins, Notices & Live Exam Tickers</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Publish site-wide announcements, news bulletins, and scheduled exam tickers with live countdown clocks.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono font-bold">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            {activeCount} Live on Portal
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
            {unpublishedCount} Unpublished
          </span>
        </div>
      </div>

      {/* Notice / Bulletin Creator Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Create New Bulletin or Scheduled Exam Notice</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Real-time candidate banner</span>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 shadow-xs animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Category Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 font-mono">
            Announcement Type & Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                id: 'bulletin' as AnnouncementCategory,
                label: 'General Bulletin',
                sub: 'Portal info, news & updates',
                icon: Megaphone,
                color: 'blue'
              },
              {
                id: 'exam' as AnnouncementCategory,
                label: 'Exam Announcement',
                sub: 'With live countdown timer',
                icon: Timer,
                color: 'amber'
              },
              {
                id: 'notice' as AnnouncementCategory,
                label: 'Official Notice',
                sub: 'Circulars & important rules',
                icon: Info,
                color: 'purple'
              },
              {
                id: 'alert' as AnnouncementCategory,
                label: 'Urgent Alert',
                sub: 'Deadlines & urgent warning',
                icon: AlertTriangle,
                color: 'rose'
              },
            ].map(item => {
              const Icon = item.icon;
              const isSelected = category === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {item.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title and Scheduled Date/Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {category === 'exam' ? 'Exam / Mock Test Title' : 'Bulletin / Notice Title'} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={category === 'exam' ? "e.g. UGC NET 2026 Paper II Special Mock CBT" : "e.g. Welcome to Evalnium Portal"}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 shadow-2xs font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                {category === 'exam' ? 'Scheduled Exam Start Date & Time *' : 'Publication Date & Time (Optional)'}
              </label>
              {category === 'bulletin' && (
                <span className="text-[10px] text-slate-400 font-mono">Defaults to Now</span>
              )}
            </div>
            <input
              type="datetime-local"
              required={category === 'exam'}
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 shadow-2xs font-mono"
            />
          </div>
        </div>

        {/* Description / Content */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Announcement Description / Details *
          </label>
          <textarea
            rows={2}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={category === 'exam' 
              ? "e.g. Test window opens tonight at 8:00 PM. 100 bilingual questions with negative marking. Review allowed." 
              : "e.g. Take your knowledge to another level with authentic NTA-style computer-based test environment."
            }
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 shadow-2xs font-medium"
          />
        </div>

        {/* Link to Exam & Countdown Checkbox */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Direct Link to Quiz / Exam (Optional)
            </label>
            <select
              value={targetQuizId}
              onChange={(e) => setTargetQuizId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 shadow-2xs font-medium bg-white"
            >
              <option value="">-- No Direct Link (Display Notice Only) --</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.topic || 'General'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center space-x-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={showTimer}
                onChange={(e) => setShowTimer(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">Show Live Countdown Timer</span>
                <p className="text-[10px] text-slate-500">Ticks down dynamically until the scheduled date arrives</p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {category === 'bulletin' 
                ? 'Publish General Bulletin' 
                : category === 'exam' 
                ? 'Publish Scheduled Exam Notice' 
                : 'Publish Announcement'}
            </span>
          </button>
        </div>
      </form>

      {/* Announcements List Table & Manager */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span className="font-black text-xs text-slate-900 uppercase font-mono tracking-wider">
              Bulletins & Tickers ({announcements.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60 text-[11px] font-bold">
              {[
                { id: 'all', label: `All (${announcements.length})` },
                { id: 'active', label: `Published (${activeCount})` },
                { id: 'unpublished', label: `Unpublished (${unpublishedCount})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    filterTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="bulletin">Bulletins</option>
              <option value="exam">Exam Notices</option>
              <option value="notice">Official Notices</option>
              <option value="alert">Urgent Alerts</option>
            </select>
          </div>
        </div>

        {filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium font-mono">
            No bulletins or notices match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredAnnouncements.map((ann) => {
              const catInfo = getCategoryDetails(ann.category);
              const schedDate = new Date(ann.scheduledDateTime);
              const isFuture = schedDate.getTime() > Date.now();
              const linkedQuiz = quizzes.find(q => q.id === ann.targetQuizId);

              return (
                <div 
                  key={ann.id} 
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors border-l-4 ${catInfo.accent} ${
                    ann.isActive ? 'bg-white' : 'bg-slate-50/70 opacity-80'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Category Badge */}
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider font-mono ${catInfo.badge}`}>
                        {catInfo.icon}
                        <span>{catInfo.label}</span>
                      </span>

                      {/* Status Badge */}
                      {ann.isActive ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>PUBLISHED (LIVE)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 border border-slate-300 text-[10px] font-mono font-bold">
                          UNPUBLISHED (HIDDEN)
                        </span>
                      )}

                      {/* Timer Enabled Indicator */}
                      {ann.showTimer && isFuture && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                          <span>Countdown Active</span>
                        </span>
                      )}

                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {ann.title}
                      </h4>
                    </div>

                    <p className="text-slate-600 font-medium text-xs leading-relaxed max-w-3xl">
                      {ann.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500 pt-0.5">
                      <span className="flex items-center space-x-1 text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{schedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </span>

                      <span className="flex items-center space-x-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>

                      {linkedQuiz && (
                        <span className="flex items-center space-x-1 text-indigo-600 font-bold">
                          <ExternalLink className="w-3 h-3" />
                          <span>Linked Exam: {linkedQuiz.title}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit, Publish / Unpublish Toggle & Delete */}
                  <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    
                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ann)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                      title="Edit Notice / Bulletin Details"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit</span>
                    </button>

                    {/* Unpublish / Publish Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(ann)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        ann.isActive
                          ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                          : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      }`}
                      title={ann.isActive ? 'Unpublish from candidate portal' : 'Publish live on candidate portal'}
                    >
                      {ann.isActive ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>Unpublish</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Publish Live</span>
                        </>
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setPendingDelete(ann)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all cursor-pointer"
                      title="Permanently Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Announcement / Notice</h3>
                  <p className="text-[11px] text-slate-500 font-mono">ID: {editingAnnouncement.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAnnouncement(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close edit modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Announcement Type & Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'bulletin' as AnnouncementCategory, label: 'Bulletin', icon: Megaphone },
                    { id: 'exam' as AnnouncementCategory, label: 'Exam Notice', icon: Timer },
                    { id: 'notice' as AnnouncementCategory, label: 'Official', icon: Info },
                    { id: 'alert' as AnnouncementCategory, label: 'Urgent', icon: AlertTriangle },
                  ].map(cat => {
                    const Icon = cat.icon;
                    const isSel = editCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEditCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSel
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Headline / Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Welcome to Evalnium Portal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Message / Summary</label>
                <textarea
                  rows={3}
                  required
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Detailed announcement or instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Date & Quiz Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editScheduledDateTime}
                    onChange={(e) => setEditScheduledDateTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Direct Link to Quiz / Exam</label>
                  <select
                    value={editTargetQuizId}
                    onChange={(e) => setEditTargetQuizId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- No Direct Link --</option>
                    {quizzes.map(q => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timer Checkbox & Status */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editShowTimer}
                    onChange={(e) => setEditShowTimer(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show Live Countdown Timer</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Published Live (Visible on Portal)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete Notice / Bulletin"
        itemName={pendingDelete?.title}
        message="Are you sure you want to permanently delete this announcement? It will immediately disappear from the portal and cannot be recovered."
        confirmLabel="Delete Notice"
        onConfirm={() => {
          if (pendingDelete) {
            onDeleteAnnouncement(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />

    </div>
  );
};
