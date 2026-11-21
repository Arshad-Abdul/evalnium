import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import { useAuth } from '../../context/AuthContext';

export interface PublicDiscussionItem {
  id: number;
  quizId: string;
  quizTitle: string;
  questionId: string;
  userName: string;
  userEmail?: string;
  role: string;
  comment: string;
  likesCount: number;
  isPinned: boolean;
  createdAt: string;
}

interface DoubtsHubViewProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz) => void;
  onNavigateToCatalog: () => void;
}

export const DoubtsHubView: React.FC<DoubtsHubViewProps> = ({
  quizzes,
  onSelectQuiz,
  onNavigateToCatalog,
}) => {
  const { currentUser } = useAuth();
  const [discussions, setDiscussions] = useState<PublicDiscussionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'admin_answered'>('all');
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [submittingThreadKey, setSubmittingThreadKey] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

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

  const handlePostReply = async (quizId: string, questionId: string, threadKey: string) => {
    const text = (replyInputMap[threadKey] || '').trim();
    if (!text) return;

    setSubmittingThreadKey(threadKey);
    try {
      const payload = {
        userName: currentUser?.role === 'admin' ? 'Evalnium Admin' : (currentUser?.name || 'Aspirant Candidate'),
        userEmail: currentUser?.email || null,
        role: currentUser?.role === 'admin' ? 'admin' : 'candidate',
        comment: text,
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
        fetchAllDiscussions();
      }
    } catch (e) {
      console.error('Failed to post reply:', e);
    } finally {
      setSubmittingThreadKey(null);
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
              Ask doubts, view verified solutions, and check official Admin replies on all test questions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAllDiscussions}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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
              ? 'You have not asked any doubts on questions yet. When reviewing your submitted exams, use the Discussion Hub under any question to ask a doubt.'
              : 'No discussions match your filter. You can ask a doubt on any question during your exam review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredThreads.map((thread) => {
            const matchedQuiz = quizzes.find(
              (q) => q.id === thread.quizId || q.title === thread.quizTitle
            );

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
                    <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                      Question: {thread.questionId}
                    </span>
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

                {/* Discussion Items in this Question Thread */}
                <div className="space-y-2.5">
                  {thread.items.map((item) => {
                    const isAdmin = item.role === 'admin' || item.role === 'faculty';
                    const isMyComment =
                      currentUser?.email &&
                      item.userEmail &&
                      item.userEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim();

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                          item.isPinned
                            ? 'bg-amber-50/60 border-amber-200'
                            : isAdmin
                            ? 'bg-slate-50 border-indigo-200 ring-1 ring-indigo-100'
                            : isMyComment
                            ? 'bg-blue-50/30 border-blue-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.userName}</span>

                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-900 text-white">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Evalnium Admin</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {isMyComment ? 'You' : 'Candidate'}
                              </span>
                            )}

                            {item.isPinned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                <Pin className="w-2.5 h-2.5" />
                                <span>Pinned Solution</span>
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className={`text-xs leading-relaxed ${isAdmin ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                          {item.comment}
                        </p>

                        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleLike(item.id)}
                            className={`flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                              likedIds.has(item.id)
                                ? 'text-indigo-600 font-bold'
                                : 'hover:text-indigo-600 text-slate-500'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>{item.likesCount > 0 ? `${item.likesCount} Helpful` : 'Helpful'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply to this Thread */}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Reply or share an alternate solution for Question ${thread.questionId}...`}
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
                  <button
                    type="button"
                    onClick={() => handlePostReply(thread.quizId, thread.questionId, thread.key)}
                    disabled={
                      submittingThreadKey === thread.key ||
                      !(replyInputMap[thread.key] || '').trim()
                    }
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>{submittingThreadKey === thread.key ? 'Posting...' : 'Reply'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

