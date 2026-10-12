import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import type { BannerItem } from '../home/HeroBannerCarousel';

interface CatalogAdCardProps {
  quizzes?: Quiz[];
  onSelectQuiz?: (quiz: Quiz) => void;
  apiBaseUrl?: string;
}

export const CatalogAdCard: React.FC<CatalogAdCardProps> = ({
  quizzes = [],
  onSelectQuiz,
  apiBaseUrl,
}) => {
  const [adBanners, setAdBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const fetchAds = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/banners?slot=catalog_ad&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAdBanners(data);
          return;
        }
      }
      setAdBanners([]);
    } catch (err) {
      console.error('Failed to fetch catalog ad box:', err);
      setAdBanners([]);
    }
  };

  useEffect(() => {
    fetchAds();

    const handleUpdate = () => fetchAds();
    window.addEventListener('evalnium_banners_updated', handleUpdate);
    const pollTimer = setInterval(fetchAds, 4000);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('evalnium_banners_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(pollTimer);
    };
  }, []);

  // Auto-advance if multiple ads exist
  useEffect(() => {
    if (adBanners.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % adBanners.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [adBanners.length, isPaused]);

  if (isDismissed || adBanners.length === 0) return null;

  const activeIndex = currentIndex >= adBanners.length ? 0 : currentIndex;
  const currentAd = adBanners[activeIndex];

  const handleClick = () => {
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

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + adBanners.length) % adBanners.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % adBanners.length);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="portal-card-interactive p-5 bg-white border border-slate-200 flex flex-col justify-between space-y-4 relative group select-none transition-all duration-300 hover:shadow-md"
    >
      <div className="space-y-3">
        {/* Header Strip: Sponsored Badge & Status */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono text-[11px] font-semibold border border-amber-200 truncate">
            {currentAd.badgeText || 'SPONSORED'}
          </span>

          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              Featured CBT
            </span>

            {/* Optional Dismiss (✕) Button */}
            {currentAd.allowDismiss !== false && (
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss sponsored card"
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Visual Graphic Banner (Clean frame matching card size) */}
        {currentAd.imageUrl ? (
          <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-100">
            <img
              src={currentAd.imageUrl}
              alt={currentAd.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

            {/* Carousel navigation arrows if multiple ads */}
            {adBanners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ) : null}

        {/* Ad Title & Description */}
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug line-clamp-2">
            {currentAd.title}
          </h3>
          {currentAd.subtitle && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
              {currentAd.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Assessment Parameter Strip & Action Button - 100% Identical to Exam Cards */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200/80">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Official CBT</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200/80">
            <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">Instant Access</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="w-full py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>{currentAd.ctaText || 'Explore Test Series'}</span>
        </button>

        {/* Minimal pagination indicator if multiple ads */}
        {adBanners.length > 1 && (
          <div className="flex items-center justify-center space-x-1 pt-0.5">
            {adBanners.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-4 bg-indigo-600' : 'w-1 bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
