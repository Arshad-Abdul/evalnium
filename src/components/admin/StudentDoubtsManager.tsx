import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  ShieldCheck,
  User,
  ThumbsUp,
  Pin,
  Trash2,
  Send,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  X,
  Maximize2,
} from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import { renderTextWithLinks, compressDiscussionImage } from '../../utils/discussionHelper';

interface AdminDiscussion {
  id: number;
  quizId: string;
  quizTitle: string;
  questionId: string;
  userName: string;
  userEmail?: string;
  role: string;
  comment: string;
  imageUrl?: string | null;
  likesCount: number;
  isPinned: boolean;
  createdAt: string;
}

interface StudentDoubtsManagerProps {
  quizzes: Quiz[];
}

export const StudentDoubtsManager: React.FC<StudentDoubtsManagerProps> = ({ quizzes }) => {
  const [discussions, setDiscussions] = useState<AdminDiscussion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'candidate' | 'faculty'>('all');
  const [replyTextMap, setReplyTextMap] = useState<Record<number, string>>({});
  const [replyImageMap, setReplyImageMap] = useState<Record<number, string | null>>({});
  const [replyImageUploadingMap, setReplyImageUploadingMap] = useState<Record<number, boolean>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<number | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return '/api';
    }
    return 'http://localhost:5050/api';
  };

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/discussions?limit=200`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDiscussions(data);
      }
    } catch (e) {
      console.error('Failed to fetch discussions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const handlePostFacultyReply = async (item: AdminDiscussion) => {
    const text = (replyTextMap[item.id] || '').trim();
    const attachedImg = replyImageMap[item.id] || null;
    if (!text && !attachedImg) return;

    setSubmittingReplyId(item.id);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/discussions/${encodeURIComponent(item.quizId)}/${encodeURIComponent(item.questionId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userName: 'Evalnium Admin',
            userEmail: 'evalniumlis@gmail.com',
            role: 'admin',
            comment: text || 'Please review the attached solution image/diagram.',
            imageUrl: attachedImg || undefined,
          }),
        }
      );

      if (res.ok) {
        setReplyTextMap((prev) => ({ ...prev, [item.id]: '' }));
        setReplyImageMap((prev) => ({ ...prev, [item.id]: null }));
        setActionSuccessMessage(`Official Admin reply posted for Question ${item.questionId}!`);
        setTimeout(() => setActionSuccessMessage(null), 3000);
        fetchDiscussions();
      } else {
        alert('Failed to post reply. Please check your admin session.');
      }
    } catch (e) {
      console.error('Error posting faculty reply:', e);
      alert('Network error while posting reply.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleReplyImageSelect = async (itemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplyImageUploadingMap((prev) => ({ ...prev, [itemId]: true }));
    try {
      const compressed = await compressDiscussionImage(file);
      setReplyImageMap((prev) => ({ ...prev, [itemId]: compressed }));
    } catch (err: any) {
      alert(err?.message || 'Could not process image.');
    } finally {
      setReplyImageUploadingMap((prev) => ({ ...prev, [itemId]: false }));
      e.target.value = '';
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/discussions/${id}/pin`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setDiscussions((prev) =>
          prev.map((d) => (d.id === id ? { ...d, isPinned: !d.isPinned } : d))
        );
      }
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this comment/doubt?')) {
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/discussions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setDiscussions((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete discussion item:', e);
    }
  };

  const filteredDiscussions = discussions.filter((d) => {
    if (filterRole === 'candidate' && d.role !== 'candidate') return false;
    if (filterRole === 'faculty' && (d.role !== 'faculty' && d.role !== 'admin')) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.userName.toLowerCase().includes(q) ||
      (d.userEmail && d.userEmail.toLowerCase().includes(q)) ||
      d.quizTitle.toLowerCase().includes(q) ||
      d.comment.toLowerCase().includes(q) ||
      String(d.questionId).includes(q)
    );
  });

  const candidateDoubtsCount = discussions.filter((d) => d.role === 'candidate').length;
  const facultyRepliesCount = discussions.filter((d) => d.role === 'faculty' || d.role === 'admin').length;

  return (
    <div className="space-y-4">
      {/* Top Banner / Metrics Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Student Questions &amp; Doubts Inbox
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 font-mono">
                  {discussions.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Review candidate questions asked across all papers. Post verified faculty answers directly to the student review threads.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchDiscussions}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Discussions</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{discussions.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-900 block">Student Doubts</span>
            <span className="text-xl font-bold font-mono text-amber-900 mt-0.5 block">{candidateDoubtsCount}</span>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-indigo-900 block">Official Admin Replies</span>
            <span className="text-xl font-bold font-mono text-indigo-900 mt-0.5 block">{facultyRepliesCount}</span>
          </div>
        </div>

        {actionSuccessMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, email, paper title, or doubt content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterRole('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${filterRole === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              All ({discussions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('candidate')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${filterRole === 'candidate'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Students ({candidateDoubtsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('faculty')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${filterRole === 'faculty'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Admin ({facultyRepliesCount})
            </button>
          </div>
        </div>
      </div>

      {/* Discussion List */}
      {loading && discussions.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
          Loading student discussions...
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 p-6 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No Student Doubts Found</p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? 'No questions match your current search query.'
              : 'As candidates complete tests and ask questions under their review scorecards, doubts will appear here in real time for faculty answers.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDiscussions.map((item) => {
            const isFaculty = item.role === 'faculty' || item.role === 'admin';
            const matchedQuiz = quizzes.find(
              (q) => q.id === item.quizId || q.title === item.quizTitle
            );
            const questionIndex = matchedQuiz?.questions?.findIndex(
              (q) => q.id === item.questionId
            );
            const matchedQuestion =
              questionIndex !== undefined && questionIndex !== -1
                ? matchedQuiz?.questions?.[questionIndex]
                : undefined;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${item.isPinned
                    ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
                    : isFaculty
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
              >
                {/* Header row: Author + Exam context + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{item.userName}</span>

                    {item.userEmail && (
                      <span className="text-[11px] font-mono text-slate-500">
                        ({item.userEmail})
                      </span>
                    )}

                    {isFaculty ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-900 text-white">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Evalnium Admin</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Candidate
                      </span>
                    )}

                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Pinned</span>
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Actions: Pin & Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(item.id)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${item.isPinned
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      title={item.isPinned ? 'Unpin Solution' : 'Pin as Top Solution'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete Comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Exam Context & Question Snapshot for Faculty / Admin */}
                {matchedQuestion ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Question #{questionIndex !== undefined ? questionIndex + 1 : ''}</span>
                        <span className="font-medium text-slate-500">({matchedQuiz?.title || item.quizTitle})</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">ID: {item.questionId}</span>
                    </div>

                    {/* Question Statement */}
                    <div className="text-slate-900 font-medium leading-relaxed">
                      {matchedQuestion.questionEnglish || matchedQuestion.questionText}
                      {matchedQuestion.questionHindi && (
                        <div className="text-[11px] text-slate-600 mt-0.5 font-normal">
                          {matchedQuestion.questionHindi}
                        </div>
                      )}
                    </div>

                    {/* Options Grid (with Correct Option highlighted for Admin) */}
                    {matchedQuestion.options && matchedQuestion.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {matchedQuestion.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isCorrect =
                            String(opt.id).trim().toUpperCase() === String(matchedQuestion.correctOptionId).trim().toUpperCase() ||
                            letter === String(matchedQuestion.correctOptionId).trim().toUpperCase();
                          return (
                            <div
                              key={opt.id || optIdx}
                              className={`flex items-start gap-1.5 px-2 py-1 rounded text-[11px] border ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={`font-mono font-bold shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-slate-400'}`}>
                                [{letter}]
                              </span>
                              <span className="flex-1 break-words">{opt.text}</span>
                              {isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Existing System Explanation (if any) */}
                    {matchedQuestion.explanation && (
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/80 leading-relaxed">
                        <span className="font-bold text-slate-800">Existing Explanation:</span> {matchedQuestion.explanation}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-100/70 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium text-slate-700">
                    <span className="font-bold text-slate-900">📚 {item.quizTitle}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-indigo-700">Question ID: {item.questionId}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{item.likesCount} Helpful reaction{item.likesCount === 1 ? '' : 's'}</span>
                  </div>
                )}

                {/* Comment Content */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-normal space-y-2">
                  <div>{renderTextWithLinks(item.comment)}</div>
                  {item.imageUrl && (
                    <div className="pt-1">
                      <div className="relative group inline-block rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer shadow-2xs hover:shadow-sm transition-shadow">
                        <img
                          src={item.imageUrl}
                          alt="Doubt attachment"
                          className="max-h-56 max-w-full sm:max-w-md object-contain rounded-lg"
                          onClick={() => setActiveZoomImage(item.imageUrl || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setActiveZoomImage(item.imageUrl || null)}
                          className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 hover:bg-black text-white text-[10px] font-bold rounded flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>View Full</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reply Form (Only if Candidate Doubt) */}
                {!isFaculty && (
                  <div className="pt-1 space-y-2">
                    {replyImageMap[item.id] && (
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-indigo-50/60 border border-indigo-200 w-fit">
                        <img
                          src={replyImageMap[item.id]!}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded border border-indigo-200 cursor-pointer"
                          onClick={() => setActiveZoomImage(replyImageMap[item.id]!)}
                        />
                        <span className="text-[11px] font-medium text-indigo-900">Image attached</span>
                        <button
                          type="button"
                          onClick={() => setReplyImageMap((prev) => ({ ...prev, [item.id]: null }))}
                          className="p-1 hover:bg-indigo-100 text-indigo-700 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Reply to ${item.userName} with official verified admin explanation...`}
                        value={replyTextMap[item.id] || ''}
                        onChange={(e) =>
                          setReplyTextMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePostFacultyReply(item);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none font-medium"
                      />

                      <label
                        className={`p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0 ${replyImageUploadingMap[item.id] ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        title="Attach Diagram or Screenshot"
                      >
                        <ImageIcon className="w-4 h-4 text-slate-600" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleReplyImageSelect(item.id, e)}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handlePostFacultyReply(item)}
                        disabled={
                          submittingReplyId === item.id ||
                          (!(replyTextMap[item.id] || '').trim() && !replyImageMap[item.id])
                        }
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>{submittingReplyId === item.id ? 'Posting...' : 'Reply as Admin'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {activeZoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveZoomImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <a
                href={activeZoomImage}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full</span>
              </a>
              <button
                type="button"
                onClick={() => setActiveZoomImage(null)}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={activeZoomImage}
              alt="Full view"
              className="max-h-[85vh] w-auto mx-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

