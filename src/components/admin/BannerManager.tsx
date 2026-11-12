import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, Eye, EyeOff, Image as ImageIcon, 
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
  const [filterSlot, setFilterSlot] = useState<'all' | 'hero' | 'header_ad' | 'catalog_ad' | 'footer_ad'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeText, setBadgeText] = useState('FULL-LENGTH CBT MOCK');
  const [ctaText, setCtaText] = useState('Take Test Now');
  const [ctaLink, setCtaLink] = useState('/');
  const [quizId, setQuizId] = useState<string>('');
  const [slotType, setSlotType] = useState<string>('hero');
  const [isActive, setIsActive] = useState(true);
  const [allowDismiss, setAllowDismiss] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [imageOnly, setImageOnly] = useState(false);

  // Upload mode: 'file' | 'url'
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return '/api';
    }
    return 'http://localhost:5050/api';
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/banners?all=true`, {
        credentials: 'include'
      });
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
    setBadgeText('');
    setCtaText('');
    setCtaLink('/');
    setQuizId('');
    setSlotType('hero');
    setIsActive(true);
    setAllowDismiss(true);
    setImageOnly(false);
    setDisplayOrder(banners.length + 1);
    setEditingBanner(null);
    setUploadMode('file');
  };

  const handleOpenAdd = (preferredSlot: string = 'hero') => {
    resetForm();
    setSlotType(preferredSlot);
    setAllowDismiss(true);
    setImageOnly(preferredSlot !== 'hero');
    setShowAddModal(true);
  };

  const handleOpenEdit = (banner: BannerItem) => {
    setEditingBanner(banner);
    setTitle(banner.title || '');
    setSubtitle(banner.subtitle || '');
    setImageUrl(banner.imageUrl || '');
    setBadgeText(banner.badgeText || '');
    setCtaText(banner.ctaText || '');
    setCtaLink(banner.ctaLink || '/');
    setQuizId(banner.quizId || '');
    setSlotType(banner.slotType || 'hero');
    setIsActive(banner.isActive);
    setAllowDismiss(banner.allowDismiss !== false);
    setImageOnly(Boolean(banner.imageOnly));
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

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large (>10MB). Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // SVGs or small files (< 500KB) are kept verbatim
      if (file.type === 'image/svg+xml' || file.size < 500 * 1024) {
        setImageUrl(dataUrl);
        return;
      }

      // Compress larger raster images cleanly to prevent slow page loads & payload limits
      const img = new Image();
      img.onload = () => {
        try {
          const maxWidth = 1600;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setImageUrl(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/webp', 0.85);
          setImageUrl(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch {
          setImageUrl(dataUrl);
        }
      };
      img.onerror = () => setImageUrl(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const extractErrorMessage = async (res: Response, fallback: string) => {
    try {
      const text = await res.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) return `${fallback} (${res.status}: ${parsed.error})`;
        } catch {
          return `${fallback} (${res.status}: ${text.slice(0, 120)})`;
        }
      }
    } catch {}
    return `${fallback} (HTTP ${res.status})`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      alert('Please provide an Image (uploaded or URL).');
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
      allowDismiss,
      imageOnly,
      displayOrder: Number(displayOrder) || 0,
    };

    try {
      if (editingBanner) {
        const res = await fetch(`${getApiBaseUrl()}/banners/${editingBanner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
          alert(await extractErrorMessage(res, 'Failed to update banner'));
        }
      } else {
        const res = await fetch(`${getApiBaseUrl()}/banners`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
          alert(await extractErrorMessage(res, 'Failed to create banner'));
        }
      }
    } catch (e) {
      console.error(e);
      alert('Network error saving banner. Please ensure backend server is running.');
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/banners/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });
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
      const res = await fetch(`${getApiBaseUrl()}/banners/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Banners &amp; Ad Slots</h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/80">
                {banners.filter((b) => b.isActive).length} active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage hero slides, header/footer strips, and catalog promotional cards.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchBanners}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAdd(filterSlot !== 'all' ? filterSlot : 'hero')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Banner</span>
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterSlot('all')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterSlot === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({banners.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterSlot('hero')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterSlot === 'hero'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hero Slider ({banners.filter((b) => (b.slotType || 'hero') === 'hero').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterSlot('header_ad')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterSlot === 'header_ad'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Top Header ({banners.filter((b) => b.slotType === 'header_ad').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterSlot('catalog_ad')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterSlot === 'catalog_ad'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Catalog Card ({banners.filter((b) => b.slotType === 'catalog_ad').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterSlot('footer_ad')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterSlot === 'footer_ad'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Footer Ad ({banners.filter((b) => b.slotType === 'footer_ad').length})
          </button>
        </div>

        {/* Banners Grid */}
        {visibleBanners.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No banners found in this slot. Click &ldquo;Add Banner&rdquo; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleBanners.map((b) => {
              const isHeaderAd = b.slotType === 'header_ad';
              const isCatalogAd = b.slotType === 'catalog_ad';
              const isFooterAd = b.slotType === 'footer_ad';
              const slotLabel = isHeaderAd ? 'Header Ad' : isFooterAd ? 'Footer Ad' : isCatalogAd ? 'Catalog Ad' : 'Hero Slide';

              return (
                <div
                  key={b.id}
                  className={`group relative bg-white rounded-xl overflow-hidden border transition-all flex flex-col ${
                    b.isActive
                      ? 'border-slate-200 hover:border-slate-300 shadow-2xs'
                      : 'border-slate-200 opacity-65'
                  }`}
                >
                  {/* Banner Thumbnail Image */}
                  <div className="relative h-36 w-full overflow-hidden bg-slate-100 border-b border-slate-100">
                    <img
                      src={b.imageUrl}
                      alt={b.title || 'Banner graphic'}
                      className="w-full h-full object-cover object-center"
                    />

                    {/* Minimal Overlay Pills */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/85 text-white backdrop-blur-xs">
                        {slotLabel}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(b.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                          b.isActive
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-white/95 text-slate-600 border-slate-300'
                        }`}
                      >
                        {b.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{b.isActive ? 'Active' : 'Draft'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Banner Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {b.title || (b.imageOnly ? 'Image Banner' : 'Untitled Banner')}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">#{b.displayOrder}</span>
                      </div>

                      {b.subtitle && (
                        <p className="text-xs text-slate-500 line-clamp-2">{b.subtitle}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                          {b.allowDismiss !== false ? 'Closeable' : 'Fixed'}
                        </span>
                        {b.imageOnly && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                            Image Only
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 text-[11px] text-slate-500 space-y-0.5">
                        <div className="truncate">
                          CTA: <strong className="text-slate-800 font-semibold">{b.ctaText || 'None'}</strong>
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-400" title={b.quizId || b.ctaLink || '/'}>
                          {b.quizId ? `Quiz: ${b.quizId}` : (b.ctaLink || '/')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(b.id, b.title)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span>{editingBanner ? 'Edit Showcase Graphic' : 'Create Showcase Banner / Ad'}</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSlotType('hero')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      slotType === 'hero'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                      <span>Hero Slider</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Full-width showcase carousel on top of the catalog.
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
                      <span>Top Header Ad</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Top billboard ad banner matching catalog width.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlotType('catalog_ad')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      slotType === 'catalog_ad'
                        ? 'bg-purple-50/80 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      <span>Catalog In-Between</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Full-width ad placed centered between exam card rows.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlotType('footer_ad')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      slotType === 'footer_ad'
                        ? 'bg-teal-50/80 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-teal-600" />
                      <span>Footer Ad</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Bottom billboard banner above the portal footer.
                    </p>
                  </button>
                </div>
              </div>

              {/* Presentation Style: Standard vs Image-Only */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-900 block text-xs">
                      Presentation Style
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Choose whether to display as a clean clickable picture or with text headlines & buttons
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setImageOnly(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !imageOnly
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Card with Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageOnly(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        imageOnly
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🖼️ Image Only (Poster)
                    </button>
                  </div>
                </div>
                {imageOnly && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium leading-relaxed">
                    <strong>Image-Only Mode Active:</strong> Only the clean picture will be shown (all badge labels, headlines, and CTA buttons are hidden). Switch to <strong>Card with Text</strong> above if you want to show text or buttons on top.
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900">
                  {imageOnly ? 'Internal Reference Label (Hidden from Candidates)' : 'Banner Headline / Title'}
                  {!imageOnly && <span className="text-[10px] font-normal text-slate-400 ml-1">(Optional — Leave empty to hide)</span>}
                </label>
                <input
                  type="text"
                  placeholder={imageOnly ? 'e.g. Library Photo Banner' : 'Leave empty to hide'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                />
              </div>

              {/* Subtitle (only relevant in Card with Text mode) */}
              {!imageOnly && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-900">
                    Description / Subtitle <span className="text-[10px] font-normal text-slate-400">(Optional — Leave empty to hide)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Leave empty to hide"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                  />
                </div>
              )}

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

              {/* Badge, CTA Button Text & Display Order */}
              <div className={`grid grid-cols-1 ${imageOnly ? 'sm:grid-cols-1' : 'sm:grid-cols-3'} gap-3`}>
                {!imageOnly && (
                  <>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-900">Badge Label <span className="text-[10px] font-normal text-slate-400">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="Leave empty to hide"
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-900">Button CTA Text <span className="text-[10px] font-normal text-slate-400">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="Leave empty to hide"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                  </>
                )}

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

              {/* Active & Dismissibility Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Publish & Make Live</span>
                    <span className="text-[10px] text-slate-500">Banner is visible to candidates on portal</span>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    id="allowDismissToggle"
                    checked={allowDismiss}
                    onChange={(e) => setAllowDismiss(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Allow Close (✕ Button)</span>
                    <span className="text-[10px] text-slate-500">Uncheck to make permanent (candidates cannot close)</span>
                  </div>
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
