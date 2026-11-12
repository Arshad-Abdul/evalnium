import React, { useState, useEffect, useRef } from 'react';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    return '/api';
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
      const trimmedLink = currentAd.ctaLink.trim();
      if (trimmedLink.startsWith('https://') || trimmedLink.startsWith('http://')) {
        window.open(trimmedLink, '_blank', 'noopener,noreferrer');
      } else if (trimmedLink.startsWith('/') && !trimmedLink.startsWith('//')) {
        window.location.href = trimmedLink;
      }
      return;
    }

    if (quizzes.length > 0 && onSelectQuiz && currentAd.quizId) {
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

  const cleanBadge = currentAd.badgeText?.trim() || '';
  const cleanTitle = currentAd.title?.trim() || '';
  const cleanSubtitle = currentAd.subtitle?.trim() || '';
  const cleanCta = currentAd.ctaText?.trim() || '';

  const isPureImage =
    currentAd.imageOnly ||
    (Boolean(currentAd.imageUrl) && !cleanBadge && !cleanTitle && !cleanSubtitle && !cleanCta);

  // Clean Full-Bleed Image Card (Zero forced badges, text, or dark overlays)
  if (isPureImage && currentAd.imageUrl) {
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="portal-card-interactive group relative overflow-hidden bg-white min-h-[260px] flex items-center justify-center select-none"
      >
        <img
          src={currentAd.imageUrl}
          alt={cleanTitle || 'Featured Banner'}
          className="w-full h-full object-cover object-center absolute inset-0"
          loading="lazy"
        />

        {currentAd.allowDismiss !== false && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss ad"
            className="absolute top-2.5 right-2.5 z-20 p-1 rounded-full bg-white/85 hover:bg-white text-slate-700 hover:text-slate-950 transition-colors cursor-pointer border border-slate-200 shadow-xs"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {adBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white/90 text-slate-800 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white/90 text-slate-800 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="portal-card-interactive p-5 flex flex-col justify-between gap-4 relative group select-none"
    >
      <div className="space-y-3">
        {/* Header Metadata (only shown if badgeText or allowDismiss is active) */}
        {(cleanBadge || currentAd.allowDismiss !== false) && (
          <div className="flex items-center justify-between gap-2 text-xs">
            {cleanBadge ? (
              <span className="font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded truncate">
                {cleanBadge}
              </span>
            ) : (
              <span />
            )}

            {currentAd.allowDismiss !== false && (
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss card"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Clean Picture Frame (no dark overlay) */}
        {currentAd.imageUrl && (
          <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-50 border border-slate-200">
            <img
              src={currentAd.imageUrl}
              alt={cleanTitle || 'Banner'}
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />

            {adBanners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 text-slate-800 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 text-slate-800 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Title & Description (only rendered if present) */}
        {(cleanTitle || cleanSubtitle) && (
          <div>
            {cleanTitle && (
              <h3 className="font-bold text-[15px] text-slate-900 leading-snug line-clamp-2">
                {cleanTitle}
              </h3>
            )}
            {cleanSubtitle && (
              <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                {cleanSubtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Button (only rendered if ctaText is present) */}
      {(cleanCta || adBanners.length > 1) && (
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          {cleanCta && (
            <button
              type="button"
              onClick={handleClick}
              className="w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{cleanCta}</span>
            </button>
          )}

          {adBanners.length > 1 && (
            <div className="flex items-center justify-center gap-1">
              {adBanners.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === activeIndex ? 'w-4 bg-blue-600' : 'w-1 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
