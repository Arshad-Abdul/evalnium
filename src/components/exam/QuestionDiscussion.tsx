import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Send, ShieldCheck, User, Sparkles, Pin, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface DiscussionItem {
  id: number;
  quizId: string;
  questionId: string;
  userName: string;
  userEmail?: string;
  role: string;
  comment: string;
  likesCount: number;
  isPinned: boolean;
  createdAt: string;
}

interface QuestionDiscussionProps {
  quizId: string;
  questionId: string;
  questionNumber?: number;
}

export const QuestionDiscussion: React.FC<QuestionDiscussionProps> = ({
  quizId,
  questionId,
  questionNumber,
}) => {
  const { currentUser } = useAuth();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState(currentUser?.name || 'Aspirant Candidate');
  const [submitting, setSubmitting] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const getApiBaseUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/discussions/${encodeURIComponent(quizId)}/${encodeURIComponent(questionId)}`);
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
  }, [quizId, questionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        userName: authorName.trim() || currentUser?.name || 'Aspirant Candidate',
        userEmail: currentUser?.email || null,
        role: currentUser?.role || 'candidate',
        comment: newComment.trim(),
      };

      const res = await fetch(`${getApiBaseUrl()}/discussions/${encodeURIComponent(quizId)}/${encodeURIComponent(questionId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewComment('');
        fetchDiscussions();
      }
    } catch (e) {
      console.error('Error posting comment:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (id: number) => {
    if (likedIds.has(id)) return;
    setLikedIds((prev) => new Set([...prev, id]));
    setDiscussions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, likesCount: d.likesCount + 1 } : d))
    );
    try {
      await fetch(`${getApiBaseUrl()}/discussions/${id}/like`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h4 className="font-bold text-xs text-slate-900">
            Discussion & Doubts Hub {questionNumber ? `for Q.${questionNumber}` : ''}
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
            {discussions.length} {discussions.length === 1 ? 'Comment' : 'Comments'}
          </span>
        </div>
      </div>

      {/* Comment Input Box */}
      <form onSubmit={handleSubmit} className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Your Name (e.g. Rahul Sharma)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-1/3 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:border-indigo-600"
          />
          <span className="text-[10px] text-slate-400 font-medium">Posting as {currentUser?.role === 'admin' ? 'Faculty Admin' : 'Candidate'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask a doubt or share an alternate explanation / shortcut for this question..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-indigo-600"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>
        </div>
      </form>

      {/* Discussion List */}
      {loading && discussions.length === 0 ? (
        <div className="text-center py-4 text-slate-400 text-xs font-medium">
          Loading discussion thread...
        </div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-4 text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          No doubts or discussions yet. Be the first to start the conversation on this question!
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {discussions.map((d) => (
            <div
              key={d.id}
              className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                d.isPinned
                  ? 'bg-amber-50/70 border-amber-200'
                  : d.role === 'admin' || d.role === 'faculty'
                  ? 'bg-indigo-50/50 border-indigo-200'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{d.userName}</span>
                  {d.role === 'admin' || d.role === 'faculty' ? (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>Verified Faculty</span>
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      Candidate
                    </span>
                  )}
                  {d.isPinned && (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                      <Pin className="w-2.5 h-2.5" />
                      <span>Pinned Solution</span>
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <p className="text-slate-700 leading-relaxed text-xs">{d.comment}</p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <button
                  onClick={() => handleLike(d.id)}
                  className={`flex items-center space-x-1 font-mono text-[11px] transition-colors cursor-pointer ${
                    likedIds.has(d.id) ? 'text-indigo-600 font-bold' : 'hover:text-indigo-600 text-slate-500'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{d.likesCount > 0 ? `${d.likesCount} Helpful` : 'Helpful'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
