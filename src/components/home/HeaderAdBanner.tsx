import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, Megaphone, Maximize2, ExternalLink } from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import type { BannerItem } from './HeroBannerCarousel';

interface HeaderAdBannerProps {
  quizzes?: Quiz[];
  onSelectQuiz?: (quiz: Quiz) => void;
  apiBaseUrl?: string;
}

export const HeaderAdBanner: React.FC<HeaderAdBannerProps> = ({
  quizzes = [],
  onSelectQuiz,
  apiBaseUrl,
}) => {
  const [adBanners, setAdBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedMap, setDismissedMap] = useState<Record<number, boolean>>({});
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchAdBanners = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/banners?slot=header_ad`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAdBanners(data);
        } else {
          setAdBanners([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch header ad banners:', err);
    }
  };

  useEffect(() => {
    fetchAdBanners();
  }, []);

  // Filter out any dismissed banners in current session
  const visibleAds = adBanners.filter((b) => !dismissedMap[b.id]);

  // Auto-advance if multiple ads exist
  useEffect(() => {
    if (visibleAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleAds.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [visibleAds.length]);

  if (visibleAds.length === 0) return null;

  const activeIndex = currentIndex >= visibleAds.length ? 0 : currentIndex;
  const currentAd = visibleAds[activeIndex];

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentAd) {
      setDismissedMap((prev) => ({ ...prev, [currentAd.id]: true }));
    }
  };

  const handleAdClick = () => {
    if (currentAd.quizId && onSelectQuiz && quizzes.length > 0) {
      const match = quizzes.find((q) => q.id === currentAd.quizId);
      if (match) {
        onSelectQuiz(match);
        return;
      }
    }

    if (currentAd.ctaLink && currentAd.ctaLink !== '/') {
      if (currentAd.ctaLink.startsWith('http')) {
        window.open(currentAd.ctaLink, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = currentAd.ctaLink;
      }
      return;
    }

    if (quizzes.length > 0 && onSelectQuiz) {
      onSelectQuiz(quizzes[0]);
    }
  };

  return (
    <>
      {/* Floating Modern Header Ad Container */}
      <aside
        aria-label="Institutional Announcement and Showcase Header Ad"
        className="w-full bg-slate-900/60 border-b border-indigo-500/20 py-2 sm:py-2.5 px-3 sm:px-6 backdrop-blur-md transition-all duration-300"
      >
        <div className="max-w-6xl mx-auto">
          <div className="relative group bg-gradient-to-r from-slate-950 via-indigo-950/90 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/60 rounded-2xl p-2 sm:p-2.5 shadow-lg shadow-indigo-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-all">
            
            {/* Subtle Ambient Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-indigo-500/20 rounded-2xl blur-xs -z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

            {/* Left Section: Picture Banner Thumbnail & Text */}
            <div 
              onClick={handleAdClick}
              className="flex items-center space-x-3 sm:space-x-4 cursor-pointer flex-1 w-full sm:w-auto min-w-0"
            >
              {/* Ad Graphic Picture Thumbnail with Zoom & Lightbox */}
              {currentAd.imageUrl ? (
                <div 
                  className="relative shrink-0 w-20 sm:w-28 h-12 sm:h-14 rounded-xl overflow-hidden border border-indigo-400/40 shadow-md bg-slate-950 group/pic cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImageModal(currentAd.imageUrl);
                  }}
                  title="Click to view full picture / flyer"
                >
                  <img
                    src={currentAd.imageUrl}
                    alt={currentAd.title}
                    className="w-full h-full object-cover object-center group-hover/pic:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/20 group-hover/pic:bg-slate-950/0 transition-colors" />
                  <div className="absolute bottom-1 right-1 p-0.5 rounded bg-slate-900/80 text-white opacity-0 group-hover/pic:opacity-100 transition-opacity">
                    <Maximize2 className="w-2.5 h-2.5 text-indigo-300" />
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-inner">
                  <Megaphone className="w-6 h-6 text-indigo-300" />
                </div>
              )}

              {/* Text Info */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                    <span>{currentAd.badgeText || 'SPECIAL ANNOUNCEMENT'}</span>
                  </span>

                  {visibleAds.length > 1 && (
                    <span className="text-[10px] font-mono text-indigo-300/80 px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-800/50">
                      {activeIndex + 1} of {visibleAds.length}
                    </span>
                  )}
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-indigo-200 transition-colors line-clamp-1 drop-shadow-xs">
                  {currentAd.title}
                </h3>
                
                {currentAd.subtitle ? (
                  <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1 font-normal opacity-90">
                    {currentAd.subtitle}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    Tap to explore official announcement & details
                  </p>
                )}
              </div>
            </div>

            {/* Right Section: Action CTA Button & Dismiss Control */}
            <div className="flex items-center justify-end space-x-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
              <button
                onClick={handleAdClick}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/30 transition-all cursor-pointer"
              >
                <span>{currentAd.ctaText || 'Explore Series'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss banner"
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                title="Dismiss Announcement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </aside>

      {/* Picture Lightbox Modal (Click to View Full Ad Flyer / Image) */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-white font-bold">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>{currentAd.title}</span>
              </div>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 flex items-center justify-center overflow-auto bg-slate-950/50">
              <img
                src={previewImageModal}
                alt={currentAd.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl border border-slate-800 shadow-xl"
              />
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                Official Uploaded Institutional Flyer / Picture
              </span>
              <button
                onClick={() => {
                  setPreviewImageModal(null);
                  handleAdClick();
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <span>{currentAd.ctaText || 'Explore'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
