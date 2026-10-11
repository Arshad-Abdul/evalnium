import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Play, Pause, ExternalLink } from 'lucide-react';
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchBanners = async () => {
    try {
      // First try hero-specific banners, fallback to active banners
      let res = await fetch(`${getBaseUrl()}/banners?slot=hero`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBanners(data);
          return;
        }
      }
      // Fallback
      res = await fetch(`${getBaseUrl()}/banners`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBanners(data.filter((b: BannerItem) => b.slotType !== 'header_ad'));
        }
      }
    } catch (e) {
      console.error('Failed to fetch banners:', e);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Auto-advance carousel every 6 seconds
  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, isPaused]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % banners.length);
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
      if (currentBanner.ctaLink.startsWith('http')) {
        window.open(currentBanner.ctaLink, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = currentBanner.ctaLink;
      }
      return;
    }

    // Default action: Start first available published quiz
    if (quizzes.length > 0) {
      onSelectQuiz(quizzes[0]);
    }
  };

  // Touch Swipe Handlers
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

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-950 text-white shadow-xl group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Hero Image with Layered Gradient Overlays */}
      <div className="relative w-full min-h-[220px] xs:min-h-[260px] sm:min-h-[300px] md:min-h-[340px] flex items-center">
        <img
          src={currentBanner.imageUrl}
          alt={currentBanner.title}
          className="absolute inset-0 w-full h-full object-cover object-center transform transition-transform duration-1000 ease-out scale-105 group-hover:scale-100 opacity-30 sm:opacity-35"
        />

        {/* High-Contrast Gradient Veil */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/60 sm:via-slate-950/90 sm:to-transparent sm:w-4/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />

        {/* Content Container - Responsive padding avoids overlap on all devices */}
        <div className="relative z-10 w-full max-w-4xl p-4 xs:p-6 sm:p-10 md:p-12 space-y-3 sm:space-y-4 px-4 sm:px-14 md:px-16">
          {/* Badge & Carousel Status */}
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-indigo-600/90 text-white text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider border border-indigo-400/40 shadow-xs">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-200" />
              <span>{currentBanner.badgeText || 'SPECIAL SPOTLIGHT'}</span>
            </span>

            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 text-[9px] sm:text-[10px] font-mono border border-slate-700">
              {currentIndex + 1} / {banners.length}
            </span>
          </div>

          {/* Headline & Description */}
          <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
            <h2 className="text-base xs:text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug drop-shadow-md break-words">
              {currentBanner.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed line-clamp-2 sm:line-clamp-3">
              {currentBanner.subtitle}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={handleCtaClick}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-indigo-500/25 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span>{currentBanner.ctaText || 'Take Test Now'}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {currentBanner.quizId && (
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                Code: <span className="text-indigo-300 font-bold">{currentBanner.quizId}</span>
              </span>
            )}
          </div>
        </div>

        {/* Carousel Navigation Arrows - Hidden on small mobile screens to prevent text overlap, visible on tablet+ */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Banner"
              className="hidden sm:flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/90 hover:bg-indigo-600 active:scale-95 text-white border border-slate-700 hover:border-indigo-400 transition-all cursor-pointer shadow-xl backdrop-blur-xs items-center justify-center opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Banner"
              className="hidden sm:flex absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/90 hover:bg-indigo-600 active:scale-95 text-white border border-slate-700 hover:border-indigo-400 transition-all cursor-pointer shadow-xl backdrop-blur-xs items-center justify-center opacity-80 hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Dots & Controls - Includes mobile arrow toggles */}
      {banners.length > 1 && (
        <div className="absolute bottom-2.5 right-3 sm:bottom-3 sm:right-6 z-20 flex items-center space-x-1.5 sm:space-x-2 bg-slate-950/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-800/80 backdrop-blur-xs">
          {/* Mobile Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="sm:hidden p-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentIndex === idx
                  ? 'w-5 sm:w-6 bg-indigo-500'
                  : 'w-1.5 sm:w-2 bg-slate-600 hover:bg-slate-400'
              }`}
            />
          ))}

          {/* Mobile Next Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            className="sm:hidden p-1 text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-slate-400 hover:text-white p-0.5 ml-1"
            title={isPaused ? 'Resume Auto-Scroll' : 'Pause Auto-Scroll'}
          >
            {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
          </button>
        </div>
      )}
    </div>
  );
};
