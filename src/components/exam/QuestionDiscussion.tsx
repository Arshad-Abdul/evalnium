import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  Send,
  ShieldCheck,
  User,
  Sparkles,
  Pin,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Maximize2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { compressDiscussionImage, renderTextWithLinks } from '../../utils/discussionHelper';

export interface DiscussionItem {
  id: number;
  quizId: string;
  questionId: string;
  userName: string;
  userEmail?: string;
  role: string;
  comment: string;
  imageUrl?: string;
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
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return '/api';
    }
    return 'http://localhost:5050/api';
  };

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/discussions/${encodeURIComponent(quizId)}/${encodeURIComponent(questionId)}`, {
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
  }, [quizId, questionId]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingImage(true);
    try {
      const base64 = await compressDiscussionImage(file);
      setAttachedImage(base64);
    } catch (err: any) {
      alert(err.message || 'Failed to process image.');
    } finally {
      setCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && !attachedImage) return;

    setSubmitting(true);
    try {
      const payload = {
        userName: authorName.trim() || currentUser?.name || (currentUser?.role === 'admin' ? 'Evalnium Admin' : 'Aspirant Candidate'),
        userEmail: currentUser?.email || null,
        role: currentUser?.role === 'admin' ? 'admin' : 'candidate',
        comment: newComment.trim(),
        imageUrl: attachedImage || null,
      };

      const res = await fetch(`${getApiBaseUrl()}/discussions/${encodeURIComponent(quizId)}/${encodeURIComponent(questionId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewComment('');
        setAttachedImage(null);
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
      await fetch(`${getApiBaseUrl()}/discussions/${id}/like`, { 
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
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

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h4 className="font-bold text-xs text-slate-900">
            Discussion &amp; Doubts Hub {questionNumber ? `for Q.${questionNumber}` : ''}
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
          <span className="text-[10px] text-slate-400 font-medium">
            Posting as {currentUser?.role === 'admin' ? 'Portal Admin' : 'Candidate'}
          </span>
        </div>

        {/* Text Input & Actions */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask a doubt, share an explanation, or paste links..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-indigo-600"
          />

          {/* Picture Attachment Button */}
          <label
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-2xs"
            title="Attach picture, screenshot, or handwritten solution"
          >
            <ImageIcon className="w-4 h-4 text-slate-600" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={compressingImage || submitting}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || (!newComment.trim() && !attachedImage)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Posting...' : 'Post'}</span>
          </button>
        </div>

        {/* Attached Picture Preview */}
        {compressingImage && (
          <div className="text-[11px] text-slate-500 font-medium animate-pulse">
            Compressing image for instant upload...
          </div>
        )}

        {attachedImage && (
          <div className="relative inline-block mt-1">
            <img
              src={attachedImage}
              alt="Attached preview"
              className="w-20 h-20 object-cover rounded-lg border border-indigo-200 shadow-2xs bg-white"
            />
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs hover:bg-rose-600 transition-colors cursor-pointer shadow-xs"
              title="Remove attachment"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
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
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {discussions.map((d) => (
            <div
              key={d.id}
              className={`p-3 rounded-2xl border text-xs space-y-2 transition-all ${
                d.isPinned
                  ? 'bg-amber-50/70 border-amber-200'
                  : d.role === 'admin' || d.role === 'faculty'
                  ? 'bg-slate-50/80 border-slate-300 ring-1 ring-slate-200'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{d.userName}</span>
                  {d.role === 'admin' || d.role === 'faculty' ? (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-900 text-white">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Evalnium Admin</span>
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

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>

                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Admin: Delete Comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Text with Clickable Links */}
              <div className="text-slate-700 leading-relaxed text-xs">
                {renderTextWithLinks(d.comment)}
              </div>

              {/* Attached Image Thumbnail */}
              {d.imageUrl && (
                <div className="pt-1">
                  <div
                    onClick={() => setLightboxImage(d.imageUrl || null)}
                    className="relative group inline-block cursor-pointer overflow-hidden rounded-lg border border-slate-200 hover:border-indigo-400 transition-colors max-w-xs"
                  >
                    <img
                      src={d.imageUrl}
                      alt="Attachment"
                      className="max-h-48 rounded-lg object-contain bg-slate-50"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Zoom</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <button
                  type="button"
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
