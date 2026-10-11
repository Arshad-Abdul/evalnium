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

  // Filter out any individually dismissed banners in current session
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
    <aside
      aria-label="Institutional Announcement and Showcase Header Ad"
      className="relative w-full bg-slate-950 bg-gradient-to-r from-slate-950 via-indigo-950/90 to-slate-900 border-b border-indigo-500/30 text-white shadow-md z-30 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Left: Thumbnail Picture & Banner Details */}
        <div 
          onClick={handleAdClick}
          className="flex items-center space-x-3 cursor-pointer group flex-1 w-full sm:w-auto"
        >
          {/* Ad Image / Graphic Picture with Glow */}
          {currentAd.imageUrl ? (
            <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-indigo-400/40 shadow-xs bg-slate-900 group-hover:scale-105 transition-transform">
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-indigo-300" />
            </div>
          )}

          {/* Text Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-none">{currentAd.badgeText || 'SPECIAL NOTICE'}</span>
              </span>

              {visibleAds.length > 1 && (
                <span className="hidden md:inline-block text-[10px] font-mono text-indigo-300/70">
                  [{activeIndex + 1}/{visibleAds.length}]
                </span>
              )}
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-indigo-200 transition-colors line-clamp-1">
              {currentAd.title}
            </h3>
            
            {currentAd.subtitle && (
              <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1 font-normal opacity-90 hidden xs:block">
                {currentAd.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Action CTA & Close Button */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <button
            onClick={handleAdClick}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs font-bold shadow-xs hover:shadow-indigo-500/30 transition-all cursor-pointer"
          >
            <span>{currentAd.ctaText || 'Explore'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Dismiss Announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </aside>
  );
};
