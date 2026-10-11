import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, Megaphone } from 'lucide-react';
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

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchAdBanners = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/banners?slot=header_ad&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAdBanners(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch header ad banners:', err);
    }
  };

  useEffect(() => {
    fetchAdBanners();

    // 1. Listen for real-time updates dispatched when admin saves/edits
    const handleUpdate = () => fetchAdBanners();
    window.addEventListener('evalnium_banners_updated', handleUpdate);

    // 2. Poll every 4 seconds to guarantee front-end reflects changes immediately without page refresh
    const pollTimer = setInterval(fetchAdBanners, 4000);

    // 3. Re-fetch on window focus / tab switch
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('evalnium_banners_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(pollTimer);
    };
  }, []);

  // Filter out any dismissed banners in current session
  const visibleAds = adBanners.filter((b) => !dismissedMap[b.id]);

  // Auto-advance if multiple ads exist
  useEffect(() => {
    if (visibleAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleAds.length);
    }, 7000);
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
    <aside
      aria-label="Institutional Promotional & Advertisement Banner"
      className="w-full py-2.5 sm:py-3 px-3 sm:px-6 transition-all duration-300"
    >
      <div className="max-w-6xl mx-auto">
        {/* Full-Picture Interactive Ad Banner - Image Fills Same Size as Banner */}
        <div
          onClick={handleAdClick}
          className="relative group w-full h-28 xs:h-32 sm:h-36 md:h-40 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700/80 shadow-lg shadow-slate-950/20 bg-slate-950 cursor-pointer select-none transition-all duration-300 hover:shadow-indigo-500/20 hover:border-indigo-500/60"
        >
          {/* 1. Full-Size Picture Background (Fills Entire Banner Area) */}
          {currentAd.imageUrl ? (
            <img
              src={currentAd.imageUrl}
              alt={currentAd.title}
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
              <Megaphone className="w-10 h-10 text-indigo-400" />
            </div>
          )}

          {/* 2. Gradient Overlay for Text Readability without blocking the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/20 pointer-events-none" />

          {/* 3. Top-Left: Glowing Badge & Carousel Counter */}
          <div className="absolute top-2.5 left-3 sm:top-3.5 sm:left-4 z-10 flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-400/40 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shadow-md">
              <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
              <span>{currentAd.badgeText || 'SPECIAL ANNOUNCEMENT'}</span>
            </span>

            {visibleAds.length > 1 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-300 text-[9px] sm:text-[10px] font-mono border border-slate-700 shadow-sm">
                {activeIndex + 1} / {visibleAds.length}
              </span>
            )}
          </div>

          {/* 4. Top-Right: Dismiss Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss ad banner"
            className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-20 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title="Dismiss ad banner"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* 5. Bottom Overlay: Banner Headline, Subtitle & Action Button */}
          <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3.5 sm:left-5 sm:right-5 z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 pointer-events-none">
            <div className="max-w-2xl drop-shadow-md pr-2">
              <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-snug drop-shadow-md line-clamp-1">
                {currentAd.title}
              </h3>
              {currentAd.subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-200 font-medium line-clamp-1 drop-shadow-sm mt-0.5">
                  {currentAd.subtitle}
                </p>
              )}
            </div>

            <div className="shrink-0 flex items-center pointer-events-auto">
              <span className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600/95 group-hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/40 flex items-center space-x-1.5 transition-all backdrop-blur-xs">
                <span>{currentAd.ctaText || 'Explore Now'}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
