import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import type { BannerItem } from './HeroBannerCarousel';

interface HeaderAdBannerProps {
  quizzes?: Quiz[];
  onSelectQuiz?: (quiz: Quiz) => void;
  apiBaseUrl?: string;
  slotType?: string; // 'header_ad' | 'catalog_ad' | string
  className?: string;
  containerClassName?: string;
}

export const HeaderAdBanner: React.FC<HeaderAdBannerProps> = ({
  quizzes = [],
  onSelectQuiz,
  apiBaseUrl,
  slotType = 'header_ad',
  className,
  containerClassName,
}) => {
  const [adBanners, setAdBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dismissedMap, setDismissedMap] = useState<Record<number, boolean>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchAdBanners = async () => {
    try {
      // 1. Fetch targeted slot banners
      const res = await fetch(`${getBaseUrl()}/banners?slot=${slotType}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAdBanners(data);
          return;
        }
      }

      // 2. Fallback: if 'catalog_ad' has no specific banners yet, borrow active header_ad banners
      if (slotType === 'catalog_ad') {
        const fallbackRes = await fetch(`${getBaseUrl()}/banners?slot=header_ad&_t=${Date.now()}`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData)) {
            setAdBanners(fallbackData);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch banners for slot "${slotType}":`, err);
    }
  };

  useEffect(() => {
    fetchAdBanners();

    // 1. Instant event listener triggered when Admin Studio saves or edits banners
    const handleUpdate = () => fetchAdBanners();
    window.addEventListener('evalnium_banners_updated', handleUpdate);

    // 2. Poll every 4 seconds to guarantee front-end reflects changes without manual refresh
    const pollTimer = setInterval(fetchAdBanners, 4000);

    // 3. Re-fetch on window focus / tab switch
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('evalnium_banners_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(pollTimer);
    };
  }, [slotType]);

  // Filter out banners dismissed during current session
  const visibleAds = adBanners.filter((b) => !dismissedMap[b.id]);

  // Carousel auto-advance (5.5 seconds per slide, paused when hovered)
  useEffect(() => {
    if (visibleAds.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleAds.length);
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visibleAds.length, isPaused]);

  if (visibleAds.length === 0) return null;

  const activeIndex = currentIndex >= visibleAds.length ? 0 : currentIndex;
  const currentAd = visibleAds[activeIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + visibleAds.length) % visibleAds.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % visibleAds.length);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentAd) {
      setDismissedMap((prev) => ({ ...prev, [currentAd.id]: true }));
    }
  };

  const handleBannerClick = (banner: BannerItem) => {
    // If targeted to a specific quiz
    if (banner.quizId && onSelectQuiz && quizzes.length > 0) {
      const match = quizzes.find((q) => q.id === banner.quizId);
      if (match) {
        onSelectQuiz(match);
        return;
      }
    }

    // If external link or path
    if (banner.ctaLink && banner.ctaLink !== '/') {
      if (banner.ctaLink.startsWith('http')) {
        window.open(banner.ctaLink, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = banner.ctaLink;
      }
      return;
    }

    // Default action: first quiz if available
    if (quizzes.length > 0 && onSelectQuiz) {
      onSelectQuiz(quizzes[0]);
    }
  };

  return (
    <aside
      aria-label="Promotional & Announcement Banner"
      className={className || "w-full transition-all duration-300"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={containerClassName || "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        {/* Billboard Ad Frame - Matches Exam Catalog Grid Width Pixel-for-Pixel */}
        <div className="relative group w-full h-28 xs:h-32 sm:h-40 md:h-44 lg:h-48 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow select-none">
          
          {/* Sliding Carousel Track */}
          <div
            className="flex w-full h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {visibleAds.map((banner) => (
              <div
                key={banner.id}
                onClick={() => handleBannerClick(banner)}
                className="w-full h-full shrink-0 relative cursor-pointer"
              >
                {banner.imageUrl ? (
                  /* 100% Full-bleed graphic ad: Image fills the exact width & height */
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || 'Promotional Banner'}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                ) : (
                  /* Clean editorial fallback when no image is uploaded */
                  <div className="w-full h-full bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-between px-6 sm:px-10">
                    <div className="space-y-1 max-w-xl">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-bold">
                        {banner.badgeText || 'Announcement'}
                      </span>
                      <h4 className="text-base sm:text-xl font-bold text-white tracking-tight line-clamp-1">
                        {banner.title}
                      </h4>
                      {banner.subtitle && (
                        <p className="text-xs sm:text-sm text-slate-300 line-clamp-1">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs">
                      <span>{banner.ctaText || 'Learn More'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Minimalist Professional "Ad" Micro-Badge */}
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-3 z-20 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-black/60 dark:bg-black/70 backdrop-blur-xs text-white/90 text-[10px] font-semibold tracking-wider uppercase border border-white/10 shadow-xs">
              {currentAd.badgeText || 'Ad'}
            </span>
          </div>

          {/* Dismiss (✕) Button - Controlled by Admin 'allowDismiss' Setting */}
          {currentAd.allowDismiss !== false && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 p-1 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-xs transition-colors cursor-pointer border border-white/10 shadow-xs active:scale-95"
              title="Dismiss ad"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Multi-banner Navigation Arrows (Appear on hover if >1 banner) */}
          {visibleAds.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous banner"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/90 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer border border-white/10 active:scale-90"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next banner"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/90 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer border border-white/10 active:scale-90"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Minimal Pagination Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1.5 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full border border-white/10">
                {visibleAds.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activeIndex
                        ? 'w-5 bg-white'
                        : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
