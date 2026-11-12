import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import type { BannerItem } from './HeroBannerCarousel';

interface HeaderAdBannerProps {
  quizzes?: Quiz[];
  onSelectQuiz?: (quiz: Quiz) => void;
  apiBaseUrl?: string;
  slotType?: string;
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    return '/api';
  };

  const fetchAdBanners = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/banners?slot=${slotType}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAdBanners(data);
          return;
        }
      }
      setAdBanners([]);
    } catch (err) {
      console.error(`Failed to fetch banners for slot "${slotType}":`, err);
      setAdBanners([]);
    }
  };

  useEffect(() => {
    fetchAdBanners();

    const handleUpdate = () => fetchAdBanners();
    window.addEventListener('evalnium_banners_updated', handleUpdate);
    const pollTimer = setInterval(fetchAdBanners, 4000);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('evalnium_banners_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(pollTimer);
    };
  }, [slotType]);

  const visibleAds = adBanners.filter((b) => !dismissedMap[b.id]);

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
    if (banner.quizId && onSelectQuiz && quizzes.length > 0) {
      const match = quizzes.find((q) => q.id === banner.quizId);
      if (match) {
        onSelectQuiz(match);
        return;
      }
    }

    if (banner.ctaLink && banner.ctaLink !== '/') {
      const trimmedLink = banner.ctaLink.trim();
      if (trimmedLink.startsWith('https://') || trimmedLink.startsWith('http://')) {
        window.open(trimmedLink, '_blank', 'noopener,noreferrer');
      } else if (trimmedLink.startsWith('/') && !trimmedLink.startsWith('//')) {
        window.location.href = trimmedLink;
      }
      return;
    }

    if (quizzes.length > 0 && onSelectQuiz && banner.quizId) {
      onSelectQuiz(quizzes[0]);
    }
  };

  const badgeLabel = !currentAd.imageOnly ? currentAd.badgeText?.trim() : '';

  return (
    <aside
      aria-label="Promotional Banner"
      className={className || 'w-full transition-all duration-300'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={containerClassName || 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        <div className="relative group w-full h-24 xs:h-28 sm:h-36 md:h-44 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs select-none">
          <div
            className="flex w-full h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {visibleAds.map((banner) => {
              const bBadge = banner.badgeText?.trim() || '';
              const bTitle = banner.title?.trim() || '';
              const bSubtitle = banner.subtitle?.trim() || '';
              const bCta = banner.ctaText?.trim() || '';

              return (
                <div
                  key={banner.id}
                  onClick={() => handleBannerClick(banner)}
                  className="w-full h-full shrink-0 relative cursor-pointer"
                >
                  {banner.imageUrl ? (
                    <>
                      <img
                        src={banner.imageUrl}
                        alt={bTitle || 'Promotional Banner'}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                      {!banner.imageOnly && (bTitle || bSubtitle || bCta) && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-transparent pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-between px-5 sm:px-8 gap-4 pointer-events-none">
                            <div className="space-y-0.5 max-w-xl min-w-0">
                              {bTitle && (
                                <h4 className="text-sm sm:text-lg font-bold text-white tracking-tight line-clamp-1">
                                  {bTitle}
                                </h4>
                              )}
                              {bSubtitle && (
                                <p className="text-xs text-slate-200 line-clamp-1">
                                  {bSubtitle}
                                </p>
                              )}
                            </div>
                            {bCta && (
                              <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs mr-6">
                                <span>{bCta}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-between px-6 sm:px-10">
                      <div className="space-y-1 max-w-xl">
                        {bBadge && (
                          <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 font-semibold">
                            {bBadge}
                          </span>
                        )}
                        {bTitle && (
                          <h4 className="text-base sm:text-xl font-bold text-white tracking-tight line-clamp-1">
                            {bTitle}
                          </h4>
                        )}
                        {bSubtitle && (
                          <p className="text-xs sm:text-sm text-slate-300 line-clamp-1">
                            {bSubtitle}
                          </p>
                        )}
                      </div>
                      {bCta && (
                        <span className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                          <span>{bCta}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional Badge Label (hidden if empty or imageOnly) */}
          {badgeLabel && (
            <div className="absolute top-2 left-2 sm:top-2.5 sm:left-3 z-20 pointer-events-none">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-semibold tracking-wide uppercase">
                {badgeLabel}
              </span>
            </div>
          )}

          {/* Dismiss (✕) Button */}
          {currentAd.allowDismiss !== false && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 p-1 rounded-full bg-white/85 hover:bg-white text-slate-700 hover:text-slate-950 transition-colors cursor-pointer border border-slate-200 shadow-xs"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Carousel Controls */}
          {visibleAds.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous banner"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next banner"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/55 px-2 py-1 rounded-full">
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
                        : 'w-1.5 bg-white/50 hover:bg-white/80'
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
