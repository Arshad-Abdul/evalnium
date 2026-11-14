import React, { useState, useEffect } from 'react';
import { Cookie, X, ShieldCheck } from 'lucide-react';

interface CookieConsentBannerProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

const COOKIE_CONSENT_KEY = 'evalnium_cookie_consent_v1';

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onOpenPrivacy,
  onOpenTerms,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Small delay so it smoothly slides in after initial page load
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside 
      aria-label="Cookie consent banner"
      className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Cookie className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Privacy & Session Cookies</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
              Evalnium uses essential session cookies and telemetry to record your test progress, scorecards, and ensure anti-cheating exam security.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAccept}
            className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px]">
          <div className="flex items-center space-x-2 text-slate-400">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-indigo-300 hover:text-indigo-200 underline font-medium cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenTerms}
              className="text-indigo-300 hover:text-indigo-200 underline font-medium cursor-pointer"
            >
              Terms
            </button>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Got it, Accept
          </button>
        </div>
      </div>
    </aside>
  );
};
