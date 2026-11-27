import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  ShieldCheck,
  User,
  ThumbsUp,
  Send,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Pin,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  X,
  Maximize2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
} from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import { useAuth } from '../../context/AuthContext';
import { compressDiscussionImage, renderTextWithLinks } from '../../utils/discussionHelper';

export interface PublicDiscussionItem {
  id: number;
  quizId: string;
  quizTitle: string;
  questionId: string;
  userName: string;
  userEmail?: string;
  role: string;
  comment: string;
  imageUrl?: string;
  likesCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

interface DoubtsHubViewProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz) => void;
  onNavigateToCatalog: () => void;
  onRequireAuth?: () => void;
}

export const DoubtsHubView: React.FC<DoubtsHubViewProps> = ({
  quizzes,
  onSelectQuiz,
  onNavigateToCatalog,
  onRequireAuth,
}) => {
  const { currentUser } = useAuth();
  const [discussions, setDiscussions] = useState<PublicDiscussionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'admin_answered'>('all');
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [replyImageMap, setReplyImageMap] = useState<Record<string, string>>({});
  const [submittingThreadKey, setSubmittingThreadKey] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [expandedQuestionMap, setExpandedQuestionMap] = useState<Record<string, boolean>>({});

  // New Post Modal / Drawer State
  const [showNewDoubtModal, setShowNewDoubtModal] = useState(false);
  const [newDoubtQuizId, setNewDoubtQuizId] = useState<string>('');
  const [newDoubtQuestionId, setNewDoubtQuestionId] = useState<string>('General Discussion');
  const [newDoubtComment, setNewDoubtComment] = useState<string>('');
  const [newDoubtImage, setNewDoubtImage] = useState<string | null>(null);
  const [submittingNewDoubt, setSubmittingNewDoubt] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);

  const newDoubtFileInputRef = useRef<HTMLInputElement>(null);

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') return '/api';
    return 'http://localhost:5050/api';
  };

  const fetchAllDiscussions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/discussions?limit=200`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDiscussions(data);
      }
    } catch (e) {
      console.error('Failed to fetch public discussions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDiscussions();
  }, []);

  const handleLike = async (id: number) => {
    if (likedIds.has(id)) return;
    setLikedIds((prev) => new Set([...prev, id]));
    setDiscussions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, likesCount: d.likesCount + 1 } : d))
    );
    try {
      await fetch(`${getApiBaseUrl()}/discussions/${id}/like`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this comment?')) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/discussions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setDiscussions((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  };

  const handleStartEditComment = (item: PublicDiscussionItem) => {
    setEditingCommentId(item.id);
    setEditCommentText(item.comment);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleSaveEditComment = async (id: number) => {
    const trimmed = editCommentText.trim();
    if (!trimmed) {
      alert('Comment text cannot be empty.');
      return;
    }
    setSavingCommentEdit(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/discussions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: trimmed }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setDiscussions((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, comment: trimmed, updatedAt: data.updatedAt || new Date().toISOString() } : d
          )
        );
        setEditingCommentId(null);
        setEditCommentText('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to update comment.');
      }
    } catch (e) {
      console.error('Failed to update comment:', e);
      alert('Network error while updating comment.');
    } finally {
      setSavingCommentEdit(false);
    }
  };

  const handleImagePickForThread = async (
    threadKey: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressDiscussionImage(file);
      setReplyImageMap((prev) => ({ ...prev, [threadKey]: base64 }));
    } catch (err: any) {
      alert(err.message || 'Image compression failed');
    }
  };

  const handlePostReply = async (quizId: string, questionId: string, threadKey: string) => {
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      else alert('Please sign in to reply to doubts.');
      return;
    }

    const text = (replyInputMap[threadKey] || '').trim();
    const image = replyImageMap[threadKey] || null;
    if (!text && !image) return;

    setSubmittingThreadKey(threadKey);
    try {
      const payload = {
        userName: currentUser.role === 'admin' ? 'Evalnium Admin' : currentUser.name,
        userEmail: currentUser.email || null,
        role: currentUser.role === 'admin' ? 'admin' : 'candidate',
        comment: text,
        imageUrl: image,
      };

      const res = await fetch(
        `${getApiBaseUrl()}/discussions/${encodeURIComponent(quizId)}/${encodeURIComponent(questionId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setReplyInputMap((prev) => ({ ...prev, [threadKey]: '' }));
        setReplyImageMap((prev) => {
          const updated = { ...prev };
          delete updated[threadKey];
          return updated;
        });
        fetchAllDiscussions();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to post reply.');
      }
    } catch (e) {
      console.error('Failed to post reply:', e);
    } finally {
      setSubmittingThreadKey(null);
    }
  };

  const handleCreateNewDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      else alert('Please sign in to ask a doubt.');
      return;
    }

    if (!newDoubtQuizId) {
      alert('Please select an examination paper.');
      return;
    }
    if (!newDoubtComment.trim() && !newDoubtImage) {
      alert('Please enter your question or attach an image.');
      return;
    }

    setSubmittingNewDoubt(true);
    try {
      const payload = {
        userName: currentUser.role === 'admin' ? 'Evalnium Admin' : currentUser.name,
        userEmail: currentUser.email || null,
        role: currentUser.role === 'admin' ? 'admin' : 'candidate',
        comment: newDoubtComment.trim(),
        imageUrl: newDoubtImage,
      };

      const res = await fetch(
        `${getApiBaseUrl()}/discussions/${encodeURIComponent(newDoubtQuizId)}/${encodeURIComponent(newDoubtQuestionId.trim() || 'General')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setNewDoubtComment('');
        setNewDoubtImage(null);
        setShowNewDoubtModal(false);
        fetchAllDiscussions();
      }
    } catch (e) {
      console.error('Failed to create new doubt:', e);
    } finally {
      setSubmittingNewDoubt(false);
    }
  };

  // Group discussions by Quiz + Question thread
  type QuestionThread = {
    key: string;
    quizId: string;
    quizTitle: string;
    questionId: string;
    items: PublicDiscussionItem[];
    hasAdminReply: boolean;
    hasMyDoubt: boolean;
    latestDate: string;
  };

  const threadMap = discussions.reduce<Record<string, QuestionThread>>((acc, d) => {
    const key = `${d.quizId}__${d.questionId}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        quizId: d.quizId,
        quizTitle: d.quizTitle,
        questionId: d.questionId,
        items: [],
        hasAdminReply: false,
        hasMyDoubt: false,
        latestDate: d.createdAt,
      };
    }
    acc[key].items.push(d);
    if (new Date(d.createdAt).getTime() > new Date(acc[key].latestDate).getTime()) {
      acc[key].latestDate = d.createdAt;
    }
    if (d.role === 'admin' || d.role === 'faculty') {
      acc[key].hasAdminReply = true;
    }
    if (
      currentUser?.email &&
      d.userEmail &&
      d.userEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()
    ) {
      acc[key].hasMyDoubt = true;
    }
    return acc;
  }, {});

  const threads = Object.values(threadMap).sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );

  const myThreadsCount = threads.filter((t) => t.hasMyDoubt).length;
  const adminAnsweredCount = threads.filter((t) => t.hasAdminReply).length;

  const filteredThreads = threads.filter((t) => {
    if (activeTab === 'my' && !t.hasMyDoubt) return false;
    if (activeTab === 'admin_answered' && !t.hasAdminReply) return false;

    if (selectedQuizFilter !== 'All' && t.quizTitle !== selectedQuizFilter) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.quizTitle.toLowerCase().includes(q) ||
      t.questionId.toLowerCase().includes(q) ||
      t.items.some(
        (i) =>
          i.comment.toLowerCase().includes(q) ||
          i.userName.toLowerCase().includes(q)
      )
    );
  });

  const uniqueQuizTitles = Array.from(new Set(threads.map((t) => t.quizTitle)));

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Return to Examination Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Candidate Doubts &amp; Discussion Hub</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Ask doubts with images and links, view verified solutions, and check official Admin answers across all tests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                if (onRequireAuth) onRequireAuth();
                else alert('Please sign in to ask a doubt.');
                return;
              }
              if (quizzes.length > 0 && !newDoubtQuizId) {
                setNewDoubtQuizId(quizzes[0].id);
              }
              setShowNewDoubtModal(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ask a Doubt</span>
          </button>

          <button
            type="button"
            onClick={fetchAllDiscussions}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Question Doubts</span>
            <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded">
              {threads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'my'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>🙋‍♂️ My Asked Doubts</span>
            <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded">
              {myThreadsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin_answered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'admin_answered'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>🛡️ Admin Answered</span>
            <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded">
              {adminAnsweredCount}
            </span>
          </button>
        </div>

        {/* Search & Paper Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search doubts by keyword (e.g. DDC, cataloguing, author, rule)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-medium"
            />
          </div>

          {uniqueQuizTitles.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Exam:</span>
              <select
                value={selectedQuizFilter}
                onChange={(e) => setSelectedQuizFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-800"
              >
                <option value="All">All Exam Papers ({threads.length})</option>
                {uniqueQuizTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Discussion Threads List */}
      {loading && threads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
          Loading doubts and discussions...
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 p-6 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Doubts Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'my'
              ? 'You have not asked any doubts yet. Click "Ask a Doubt" or use the Discussion Hub under any question during your exam review.'
              : 'No discussions match your filter. You can be the first to ask a doubt or post a discussion on any question.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredThreads.map((thread) => {
            const matchedQuiz = quizzes.find(
              (q) => q.id === thread.quizId || q.title === thread.quizTitle
            );
            const questionIndex = matchedQuiz?.questions?.findIndex(
              (q) => q.id === thread.questionId
            );
            const matchedQuestion =
              questionIndex !== undefined && questionIndex !== -1
                ? matchedQuiz?.questions?.[questionIndex]
                : undefined;
            const isOptionsExpanded = Boolean(expandedQuestionMap[thread.key]);
            const attachedImageForThread = replyImageMap[thread.key] || null;

            return (
              <div
                key={thread.key}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-2xs hover:border-slate-300 transition-all"
              >
                {/* Thread Header: Exam Title & Question Context */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                      📚 {thread.quizTitle}
                    </span>
                    {matchedQuestion ? (
                      <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        Question #{questionIndex !== undefined ? questionIndex + 1 : ''}
                      </span>
                    ) : (
                      <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        Question: {thread.questionId}
                      </span>
                    )}
                    {thread.hasAdminReply ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Admin Replied</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending Admin Reply</span>
                      </span>
                    )}
                  </div>

                  {matchedQuiz && (
                    <button
                      type="button"
                      onClick={() => onSelectQuiz(matchedQuiz)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      <span>Take Exam</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Neutral Question Snapshot (No Answer Revealed / Zero Cheating) */}
                {matchedQuestion && (
                  <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-slate-900 leading-relaxed min-w-0 flex-1">
                        <span className="font-bold text-indigo-900 font-mono mr-1.5">Q.{questionIndex !== undefined ? questionIndex + 1 : ''}.</span>
                        <span>{matchedQuestion.questionEnglish || matchedQuestion.questionText}</span>
                        {matchedQuestion.questionHindi && (
                          <p className="text-[11.5px] text-slate-600 font-normal mt-1 leading-normal">
                            {matchedQuestion.questionHindi}
                          </p>
                        )}
                      </div>

                      {matchedQuestion.options && matchedQuestion.options.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuestionMap((prev) => ({
                              ...prev,
                              [thread.key]: !prev[thread.key],
                            }))
                          }
                          className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          title={isOptionsExpanded ? 'Hide choices' : 'View choices'}
                        >
                          <HelpCircle className="w-3 h-3 text-indigo-600" />
                          <span>{isOptionsExpanded ? 'Hide Options' : 'View Options'}</span>
                          {isOptionsExpanded ? (
                            <ChevronUp className="w-3 h-3 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expandable Options List (NEUTRAL - NO CORRECT ANSWER HIGHLIGHTED / ZERO SPOILER) */}
                    {isOptionsExpanded && matchedQuestion.options && matchedQuestion.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                        {matchedQuestion.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={opt.id || optIdx}
                              className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200/90 text-slate-800 text-[11.5px] leading-snug shadow-2xs"
                            >
                              <span className="font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-[10.5px] shrink-0">
                                {letter}
                              </span>
                              <span className="flex-1 break-words font-medium">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Structured Discussion Thread */}
                {(() => {
                  // Sort thread items chronologically (oldest first) so conversational order is preserved
                  const chronologicalItems = [...thread.items].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  );

                  // The original student doubt is the earliest question asked by a candidate
                  const originalStudentDoubt = chronologicalItems.find(
                    (i) => i.role !== 'admin' && i.role !== 'faculty'
                  );

                  // Official faculty/admin answers
                  const adminReplies = chronologicalItems.filter(
                    (i) => i.role === 'admin' || i.role === 'faculty'
                  );

                  // Other student/peer replies (excluding the student who asked the original doubt)
                  const communityReplies = chronologicalItems.filter(
                    (i) => i.role !== 'admin' && i.role !== 'faculty' && i.id !== originalStudentDoubt?.id
                  );

                  const renderItem = (item: PublicDiscussionItem, isOriginal: boolean, isOfficialAdmin: boolean) => {
                    const isMyComment =
                      currentUser?.email &&
                      item.userEmail &&
                      item.userEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim();

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                          item.isPinned
                            ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                            : isOfficialAdmin
                            ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                            : isOriginal
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                            : isMyComment
                            ? 'bg-blue-50/40 border-blue-200'
                            : 'bg-white border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`font-bold ${isOfficialAdmin ? 'text-white' : 'text-slate-900'}`}>
                              {item.userName}
                            </span>

                            {isOfficialAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>Verified Admin Solution</span>
                              </span>
                            ) : isOriginal ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                <span>❓ Question Author</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Student Reply
                              </span>
                            )}

                            {isMyComment && !isOfficialAdmin && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                You
                              </span>
                            )}

                            {item.isPinned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Pin className="w-2.5 h-2.5" />
                                <span>Pinned</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono ${isOfficialAdmin ? 'text-slate-400' : 'text-slate-400'}`}>
                              {new Date(item.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {item.updatedAt && (
                                <span className={`ml-1 text-[9px] italic ${isOfficialAdmin ? 'text-emerald-400 font-sans' : 'text-indigo-500 font-sans'}`}>
                                  (edited)
                                </span>
                              )}
                            </span>

                            {currentUser?.role === 'admin' && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    editingCommentId === item.id
                                      ? handleCancelEditComment()
                                      : handleStartEditComment(item)
                                  }
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    editingCommentId === item.id
                                      ? 'text-indigo-400 font-bold bg-indigo-500/20'
                                      : isOfficialAdmin
                                      ? 'text-slate-400 hover:text-indigo-300'
                                      : 'text-slate-400 hover:text-indigo-600'
                                  }`}
                                  title="Admin: Edit Comment"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    isOfficialAdmin
                                      ? 'text-slate-400 hover:text-rose-400'
                                      : 'text-slate-400 hover:text-rose-600'
                                  }`}
                                  title="Admin: Delete Comment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Comment Content or Inline Editor */}
                        {editingCommentId === item.id ? (
                          <div className="p-2.5 rounded-lg border border-indigo-400 bg-white text-slate-900 space-y-2 my-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                              <span className="flex items-center gap-1 text-indigo-700">
                                <Edit3 className="w-3 h-3" />
                                Edit Comment
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">Ctrl+Enter to save</span>
                            </div>
                            <textarea
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') handleCancelEditComment();
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  handleSaveEditComment(item.id);
                                }
                              }}
                              rows={3}
                              className="w-full p-2 text-xs rounded border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none leading-relaxed text-slate-900"
                              placeholder="Edit comment..."
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={handleCancelEditComment}
                                disabled={savingCommentEdit}
                                className="px-2 py-0.5 text-xs rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditComment(item.id)}
                                disabled={savingCommentEdit || !editCommentText.trim()}
                                className="px-2.5 py-0.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                {savingCommentEdit ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`text-xs leading-relaxed ${isOfficialAdmin ? 'text-slate-200' : 'text-slate-800'}`}>
                            {renderTextWithLinks(item.comment)}
                          </div>
                        )}

                        {/* Attached Image Thumbnail */}
                        {item.imageUrl && (
                          <div className="pt-1">
                            <div
                              onClick={() => setLightboxImage(item.imageUrl || null)}
                              className="relative group inline-block cursor-pointer overflow-hidden rounded-lg border border-slate-200 hover:border-indigo-400 transition-colors max-w-sm"
                            >
                              <img
                                src={item.imageUrl}
                                alt="Doubt attachment"
                                className="max-h-56 rounded-lg object-contain bg-slate-50"
                              />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Zoom</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleLike(item.id)}
                            className={`flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                              likedIds.has(item.id)
                                ? isOfficialAdmin ? 'text-emerald-400 font-bold' : 'text-indigo-600 font-bold'
                                : isOfficialAdmin ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>{item.likesCount > 0 ? `${item.likesCount} Helpful` : 'Helpful'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-3">
                      {/* 1. Original Student Doubt */}
                      {originalStudentDoubt && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                            <span>❓ Original Doubt / Question</span>
                          </div>
                          {renderItem(originalStudentDoubt, true, false)}
                        </div>
                      )}

                      {/* 2. Official Faculty Admin Answers */}
                      {adminReplies.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Official Admin &amp; Faculty Answers ({adminReplies.length})</span>
                          </div>
                          <div className="space-y-2">
                            {adminReplies.map((item) => renderItem(item, false, true))}
                          </div>
                        </div>
                      )}

                      {/* 3. Peer Community Replies */}
                      {communityReplies.length > 0 && (
                        <div className="space-y-2 pt-1 pl-2 sm:pl-3 border-l-2 border-slate-200">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            <span>Peer Discussion &amp; Candidate Solutions ({communityReplies.length})</span>
                          </div>
                          <div className="space-y-2">
                            {communityReplies.map((item) => renderItem(item, false, false))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Reply Form or Login Gate */}
                {!currentUser ? (
                  <div className="pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <span className="text-slate-600 font-medium">
                        🔒 Sign in with your candidate account to answer this doubt or join the discussion.
                      </span>
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 shadow-2xs"
                      >
                        Sign In to Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 space-y-2">
                    {attachedImageForThread && (
                      <div className="relative inline-block">
                        <img
                          src={attachedImageForThread}
                          alt="Reply preview"
                          className="w-16 h-16 object-cover rounded-lg border border-indigo-200 shadow-2xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReplyImageMap((prev) => {
                              const updated = { ...prev };
                              delete updated[thread.key];
                              return updated;
                            });
                          }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Reply to Question ${thread.questionId} as ${currentUser.role === 'admin' ? 'Evalnium Admin' : currentUser.name}...`}
                        value={replyInputMap[thread.key] || ''}
                        onChange={(e) =>
                          setReplyInputMap((prev) => ({ ...prev, [thread.key]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePostReply(thread.quizId, thread.questionId, thread.key);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none font-medium"
                      />

                      {/* Image Attachment Button */}
                      <label
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
                        title="Attach picture or screenshot"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImagePickForThread(thread.key, e)}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handlePostReply(thread.quizId, thread.questionId, thread.key)}
                        disabled={
                          submittingThreadKey === thread.key ||
                          (!attachedImageForThread && !(replyInputMap[thread.key] || '').trim())
                        }
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>{submittingThreadKey === thread.key ? 'Posting...' : 'Reply'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ask a New Doubt Modal */}
      {showNewDoubtModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[92vh]">
            <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">Post Question / Doubt</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDoubtModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDoubt} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Examination Paper *</label>
                <select
                  required
                  value={newDoubtQuizId}
                  onChange={(e) => setNewDoubtQuizId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium"
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Question Number or Topic Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question 14, DDC Table 2, AACR2 Rule"
                  value={newDoubtQuestionId}
                  onChange={(e) => setNewDoubtQuestionId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Question or Explanation *</label>
                <textarea
                  rows={4}
                  placeholder="Explain your doubt in detail or paste reference links..."
                  value={newDoubtComment}
                  onChange={(e) => setNewDoubtComment(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium"
                />
              </div>

              {/* Attach Picture */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Picture / Screenshot (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer text-xs">
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>Choose Image</span>
                    <input
                      ref={newDoubtFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const base64 = await compressDiscussionImage(file);
                          setNewDoubtImage(base64);
                        } catch (err: any) {
                          alert(err.message || 'Image failed to compress');
                        }
                      }}
                    />
                  </label>

                  {newDoubtImage && (
                    <div className="relative inline-block">
                      <img
                        src={newDoubtImage}
                        alt="Thumbnail"
                        className="w-12 h-12 object-cover rounded-lg border border-indigo-200 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setNewDoubtImage(null)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewDoubtModal(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNewDoubt || (!newDoubtComment.trim() && !newDoubtImage)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingNewDoubt ? 'Posting...' : 'Post Doubt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl p-2 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged attachment"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
