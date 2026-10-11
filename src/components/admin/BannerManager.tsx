import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye, EyeOff, Sparkles, Image, Link2, ExternalLink, ArrowUp, ArrowDown, CheckCircle, RefreshCw } from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import type { BannerItem } from '../home/HeroBannerCarousel';

interface BannerManagerProps {
  quizzes: Quiz[];
}

export const BannerManager: React.FC<BannerManagerProps> = ({ quizzes }) => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeText, setBadgeText] = useState('ALL-INDIA CBT MOCK');
  const [ctaText, setCtaText] = useState('Take Test Now');
  const [ctaLink, setCtaLink] = useState('/');
  const [quizId, setQuizId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);

  const getApiBaseUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/banners?all=true`);
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (e) {
      console.error('Failed to fetch banners:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setBadgeText('ALL-INDIA CBT MOCK');
    setCtaText('Take Test Now');
    setCtaLink('/');
    setQuizId('');
    setIsActive(true);
    setDisplayOrder(banners.length + 1);
    setEditingBanner(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (banner: BannerItem) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || '');
    setImageUrl(banner.imageUrl);
    setBadgeText(banner.badgeText || 'SPOTLIGHT');
    setCtaText(banner.ctaText || 'Take Test Now');
    setCtaLink(banner.ctaLink || '/');
    setQuizId(banner.quizId || '');
    setIsActive(banner.isActive);
    setDisplayOrder(banner.displayOrder);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      alert('Please provide a Title and Image URL');
      return;
    }

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      imageUrl: imageUrl.trim(),
      badgeText: badgeText.trim(),
      ctaText: ctaText.trim(),
      ctaLink: ctaLink.trim(),
      quizId: quizId ? quizId : null,
      isActive,
      displayOrder: Number(displayOrder) || 0,
    };

    try {
      if (editingBanner) {
        const res = await fetch(`${getApiBaseUrl()}/banners/${editingBanner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowAddModal(false);
          resetForm();
          fetchBanners();
        } else {
          alert('Failed to update banner.');
        }
      } else {
        const res = await fetch(`${getApiBaseUrl()}/banners`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowAddModal(false);
          resetForm();
          fetchBanners();
        } else {
          alert('Failed to create banner.');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Error saving banner.');
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/banners/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number, bannerTitle: string) => {
    if (!confirm(`Are you sure you want to delete banner "${bannerTitle}"?`)) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/banners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-200">
                PROMOTIONAL ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                {banners.filter((b) => b.isActive).length} Live Banners
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2 mt-1">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Homepage Showcase Banners & Advertisements</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage hero carousel banners, spotlight new tests, publish exam notifications, and link directly to exam series.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchBanners}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Banner</span>
            </button>
          </div>
        </div>

        {/* Banners Grid */}
        {banners.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            No banners created yet. Click "Add New Banner" above to publish your first spotlight carousel.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {banners.map((b) => (
              <div
                key={b.id}
                className={`group relative bg-slate-900 text-white rounded-2xl overflow-hidden border transition-all ${b.isActive
                    ? 'border-slate-800 shadow-md hover:border-indigo-500'
                    : 'border-slate-800 opacity-60'
                  }`}
              >
                {/* Banner Thumbnail Image */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-950">
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 text-white border border-indigo-400/40">
                      {b.badgeText || 'SPOTLIGHT'}
                    </span>

                    <button
                      onClick={() => handleToggleActive(b.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center space-x-1 ${b.isActive
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                    >
                      {b.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{b.isActive ? 'Active' : 'Draft'}</span>
                    </button>
                  </div>

                  {/* Priority Order */}
                  <div className="absolute bottom-2 left-3 font-mono text-[10px] text-slate-400">
                    Order: #{b.displayOrder}
                  </div>
                </div>

                {/* Banner Body */}
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-sm text-white line-clamp-1 leading-snug">{b.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">{b.subtitle}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    <span>CTA: <strong className="text-indigo-300">{b.ctaText}</strong></span>
                    {b.quizId ? (
                      <span className="text-emerald-400">Test: {b.quizId}</span>
                    ) : (
                      <span className="text-slate-400">General URL</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center space-x-1"
                    >
                      <Edit className="w-3 h-3 text-indigo-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(b.id, b.title)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Banner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                <span>{editingBanner ? 'Edit Showcase Banner' : 'Create New Promotional Banner'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900">Banner Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NTA UGC NET / JRF 2026 Paper 1 Live Mock Series"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900">Description / Subtitle</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Comprehensive Bilingual Assessment covering Teaching & Research Aptitude."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                />
              </div>

              {/* Image URL & Preview */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Image URL (High-Res 16:9 or Banner Photo) *</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                  />
                  {imageUrl && (
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200"
                      title="Preview Image"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Target Routing: Link directly to a Quiz or Custom Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900">Target Exam (Direct Launch)</label>
                  <select
                    value={quizId}
                    onChange={(e) => setQuizId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                  >
                    <option value="">-- No Direct Exam (Use Custom Link) --</option>
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.questions.length}Q)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900">Or Custom External Link</label>
                  <input
                    type="text"
                    placeholder="e.g. /catalog or https://t.me/..."
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Badge & CTA Button Text */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900">Badge Label</label>
                  <input
                    type="text"
                    placeholder="e.g. ALL-INDIA MOCK"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900">Button CTA Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Start Mock Test"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-slate-800 cursor-pointer">
                  Publish & Make Live on Homepage immediately
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingBanner ? 'Update Banner' : 'Publish Banner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
