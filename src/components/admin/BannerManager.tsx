import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, Eye, EyeOff, Sparkles, Image as ImageIcon, 
  Link2, ExternalLink, RefreshCw, Upload, CheckCircle2, Megaphone,
  LayoutGrid, Layers
} from 'lucide-react';
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

  // Filter State
  const [filterSlot, setFilterSlot] = useState<'all' | 'hero' | 'header_ad'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeText, setBadgeText] = useState('ALL-INDIA CBT MOCK');
  const [ctaText, setCtaText] = useState('Take Test Now');
  const [ctaLink, setCtaLink] = useState('/');
  const [quizId, setQuizId] = useState<string>('');
  const [slotType, setSlotType] = useState<string>('hero');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);

  // Upload mode: 'file' | 'url'
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

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
    setSlotType('hero');
    setIsActive(true);
    setDisplayOrder(banners.length + 1);
    setEditingBanner(null);
    setUploadMode('file');
  };

  const handleOpenAdd = (preferredSlot: string = 'hero') => {
    resetForm();
    setSlotType(preferredSlot);
    if (preferredSlot === 'header_ad') {
      setBadgeText('SPONSORED NOTICE');
      setCtaText('Explore Series');
    }
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
    setSlotType(banner.slotType || 'hero');
    setIsActive(banner.isActive);
    setDisplayOrder(banner.displayOrder);
    setUploadMode(banner.imageUrl.startsWith('data:') ? 'file' : 'url');
    setShowAddModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP, SVG).');
      return;
    }

    // Limit check to ~5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file is large (>5MB). Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      alert('Please provide a Title and an Image (uploaded or URL).');
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
      slotType: slotType || 'hero',
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
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('evalnium_banners_updated'));
          }
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
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('evalnium_banners_updated'));
          }
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('evalnium_banners_updated'));
        }
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('evalnium_banners_updated'));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered view
  const visibleBanners = banners.filter((b) => {
    if (filterSlot === 'all') return true;
    return (b.slotType || 'hero') === filterSlot;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-200">
                PROMOTIONAL ENGINE & AD MODULE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                {banners.filter((b) => b.isActive).length} Live Showcase Items
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center space-x-2 mt-1">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Homepage Banners, Header Ads & Picture Showcase</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Upload promotional ad graphics from your PC, manage top notification strips, and configure hero carousel slides.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchBanners}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => handleOpenAdd('header_ad')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Header Ad</span>
            </button>

            <button
              onClick={() => handleOpenAdd('hero')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hero Slide</span>
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit text-xs font-bold">
          <button
            onClick={() => setFilterSlot('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterSlot === 'all'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All Showcase ({banners.length})</span>
          </button>

          <button
            onClick={() => setFilterSlot('hero')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterSlot === 'hero'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Hero Slider ({banners.filter((b) => (b.slotType || 'hero') === 'hero').length})</span>
          </button>

          <button
            onClick={() => setFilterSlot('header_ad')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterSlot === 'header_ad'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-500" />
            <span>Header Ad / Notice ({banners.filter((b) => b.slotType === 'header_ad').length})</span>
          </button>
        </div>

        {/* Banners Grid */}
        {visibleBanners.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No banners found in this category. Click "Add Header Ad" or "Add Hero Slide" above to publish.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleBanners.map((b) => {
              const isHeaderAd = b.slotType === 'header_ad';

              return (
                <div
                  key={b.id}
                  className={`group relative bg-slate-900 text-white rounded-2xl overflow-hidden border transition-all ${
                    b.isActive
                      ? 'border-slate-800 shadow-md hover:border-indigo-500'
                      : 'border-slate-800 opacity-60'
                  }`}
                >
                  {/* Banner Thumbnail Image */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-950">
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white border ${
                          isHeaderAd 
                            ? 'bg-amber-600 border-amber-400/40' 
                            : 'bg-indigo-600 border-indigo-400/40'
                        }`}>
                          {isHeaderAd ? 'HEADER AD' : 'HERO SLIDE'}
                        </span>
                        
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800/80 text-slate-200 border border-slate-700">
                          {b.badgeText || 'SPOTLIGHT'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleActive(b.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center space-x-1 cursor-pointer ${
                          b.isActive
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
                        <span className="text-slate-400 truncate max-w-[120px]">{b.ctaLink || 'General'}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center space-x-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3 text-indigo-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(b.id, b.title)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Banner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                <span>{editingBanner ? 'Edit Showcase Graphic' : 'Create New Promotional Showcase / Ad'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              
              {/* Placement Slot Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900">Placement Slot / Module *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSlotType('hero')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      slotType === 'hero'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Hero Carousel Slide</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Full-width showcase slider on the examination catalog.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlotType('header_ad')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      slotType === 'header_ad'
                        ? 'bg-amber-50/80 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                      <span>Header Ad / Notice Banner</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Full-picture ad banner (image fills entire banner size).
                    </p>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900">Banner Headline / Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Edition NTA UGC NET 2026 Test Series Available"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900">Description / Subtitle (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Comprehensive Bilingual Assessment covering Teaching & Research Aptitude."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                />
              </div>

              {/* Image / Picture Upload from Local PC or URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-900 block">Banner Picture / Graphic *</label>
                    <span className="text-[10px] text-indigo-600 font-medium">Picture fills the entire ad banner width & height</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        uploadMode === 'file' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Upload File from PC
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        uploadMode === 'url' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {uploadMode === 'file' ? (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50/40 hover:bg-indigo-50/70 cursor-pointer transition-colors group">
                      <Upload className="w-6 h-6 text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800">Choose picture or drag and drop</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Recommended: 1200x300 or panoramic banner graphic (PNG, JPG, WebP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
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
                        title="Open Image"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Picture Preview */}
                {imageUrl && (
                  <div className="relative mt-2 p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center space-x-3">
                    <img
                      src={imageUrl}
                      alt="Uploaded Preview"
                      className="w-16 h-12 object-cover rounded-lg border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Picture ready to publish</span>
                      </p>
                      <span className="text-[9px] font-mono text-slate-400">
                        {imageUrl.startsWith('data:') ? 'Local file uploaded' : 'Remote web asset'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-slate-400 hover:text-rose-400 p-1 text-xs cursor-pointer"
                      title="Clear picture"
                    >
                      ✕
                    </button>
                  </div>
                )}
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
                    placeholder="e.g. /catalog or https://..."
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
                    placeholder="e.g. LIMITED ENROLLMENT"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900">Button CTA Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Explore Series"
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
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-slate-800 cursor-pointer">
                  Publish & Make Live on Portal immediately
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingBanner ? 'Save Changes' : 'Publish Showcase Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
