import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Play, Pause, X } from 'lucide-react';
import type { Quiz } from '../../types/quiz';

export interface BannerItem {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  badgeText?: string;
  ctaText?: string;
  ctaLink?: string;
  quizId?: string | null;
  slotType?: string;
  isActive: boolean;
  displayOrder: number;
  allowDismiss?: boolean;
  imageOnly?: boolean;
}

interface HeroBannerCarouselProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz) => void;
  apiBaseUrl?: string;
}

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({
  quizzes,
  onSelectQuiz,
  apiBaseUrl,
}) => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dismissedMap, setDismissedMap] = useState<Record<number, boolean>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    return '/api';
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/banners?slot=hero&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBanners(data);
          return;
        }
      }
      setBanners([]);
    } catch (e) {
      console.error('Failed to fetch hero banners:', e);
      setBanners([]);
    }
  };

  useEffect(() => {
    fetchBanners();

    const handleUpdate = () => fetchBanners();
    window.addEventListener('evalnium_banners_updated', handleUpdate);
    const pollTimer = setInterval(fetchBanners, 4000);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('evalnium_banners_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(pollTimer);
    };
  }, []);

  const visibleBanners = banners.filter((b) => !dismissedMap[b.id]);

  useEffect(() => {
    if (visibleBanners.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visibleBanners.length, isPaused]);

  if (visibleBanners.length === 0) return null;

  const activeIndex = currentIndex >= visibleBanners.length ? 0 : currentIndex;
  const currentBanner = visibleBanners[activeIndex];

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentBanner) {
      setDismissedMap((prev) => ({ ...prev, [currentBanner.id]: true }));
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
  };

  const handleCtaClick = () => {
    if (currentBanner.quizId) {
      const targetQuiz = quizzes.find((q) => q.id === currentBanner.quizId);
      if (targetQuiz) {
        onSelectQuiz(targetQuiz);
        return;
      }
    }

    if (currentBanner.ctaLink && currentBanner.ctaLink !== '/') {
      const trimmedLink = currentBanner.ctaLink.trim();
      if (trimmedLink.startsWith('https://') || trimmedLink.startsWith('http://')) {
        window.open(trimmedLink, '_blank', 'noopener,noreferrer');
      } else if (trimmedLink.startsWith('/') && !trimmedLink.startsWith('//')) {
        window.location.href = trimmedLink;
      }
      return;
    }

    if (quizzes.length > 0 && currentBanner.quizId) {
      onSelectQuiz(quizzes[0]);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const cleanBadge = currentBanner.badgeText?.trim() || '';
  const cleanTitle = currentBanner.title?.trim() || '';
  const cleanSubtitle = currentBanner.subtitle?.trim() || '';
  const cleanCta = currentBanner.ctaText?.trim() || '';

  const showOverlay =
    !currentBanner.imageOnly &&
    Boolean(cleanBadge || cleanTitle || cleanSubtitle || cleanCta);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        onClick={!showOverlay ? handleCtaClick : undefined}
        className={`relative w-full min-h-[190px] sm:min-h-[260px] md:min-h-[310px] flex items-center ${
          !showOverlay ? 'cursor-pointer' : ''
        }`}
      >
        <img
          src={currentBanner.imageUrl}
          alt={cleanTitle || 'Banner'}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Render text scrim and overlays ONLY when non-imageOnly text exists */}
        {showOverlay && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-transparent sm:w-3/5 pointer-events-none" />
            <div className="relative z-10 w-full max-w-3xl p-5 sm:p-10 md:p-12 space-y-3">
              {cleanBadge && (
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/90 text-slate-900 text-[11px] font-semibold tracking-wide uppercase">
                  {cleanBadge}
                </span>
              )}

              {(cleanTitle || cleanSubtitle) && (
                <div className="space-y-1.5 max-w-xl">
                  {cleanTitle && (
                    <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug drop-shadow-xs break-words">
                      {cleanTitle}
                    </h2>
                  )}
                  {cleanSubtitle && (
                    <p className="text-xs sm:text-sm text-slate-100/90 font-normal leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {cleanSubtitle}
                    </p>
                  )}
                </div>
              )}

              {cleanCta && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{cleanCta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Dismiss (✕) Button when Allow Close is checked */}
        {currentBanner.allowDismiss !== false && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close banner"
            className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-white/85 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200 transition-colors cursor-pointer shadow-xs"
            title="Close banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Carousel Navigation Arrows (shown only when >1 banner exists) */}
        {visibleBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Banner"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-slate-200 transition-all cursor-pointer shadow-sm items-center justify-center opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Banner"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-slate-200 transition-all cursor-pointer shadow-sm items-center justify-center opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Pagination Dots (only when >1 banner) */}
      {visibleBanners.length > 1 && (
        <div className="absolute bottom-2.5 right-3 sm:bottom-3 sm:right-4 z-20 flex items-center gap-1.5 bg-slate-900/65 px-2.5 py-1 rounded-full backdrop-blur-xs">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="sm:hidden p-0.5 text-white/80 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {visibleBanners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                activeIndex === idx
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            className="sm:hidden p-0.5 text-white/80 hover:text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="text-white/80 hover:text-white p-0.5 ml-0.5"
            title={isPaused ? 'Resume Auto-Scroll' : 'Pause Auto-Scroll'}
          >
            {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
          </button>
        </div>
      )}
    </div>
  );
};
