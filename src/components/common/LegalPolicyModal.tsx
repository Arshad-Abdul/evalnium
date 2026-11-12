import React, { useEffect } from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

export type LegalDocType = 'terms' | 'privacy';

interface LegalPolicyModalProps {
  docType: LegalDocType | null;
  onClose: () => void;
}

export const LegalPolicyModal: React.FC<LegalPolicyModalProps> = ({ docType, onClose }) => {
  useEffect(() => {
    if (!docType) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [docType, onClose]);

  if (!docType) return null;

  const isTerms = docType === 'terms';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="bg-white max-w-2xl w-full max-h-[85vh] flex flex-col rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              {isTerms ? <FileText className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="legal-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {isTerms ? 'Terms & Conditions' : 'Privacy Policy'}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Evalnium Assessment Portal · Updated 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-[13px] text-slate-600 leading-relaxed">
          {isTerms ? (
            <>
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">1. Platform Purpose & Independence</h3>
                <p>
                  Evalnium is an independent educational mock test, practice quiz, and study-resource platform operated by Arshad Abdul. It is not affiliated with, endorsed by, or an official examination portal of NTA, UGC, or any government recruitment body.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">2. Account & Registration Accuracy</h3>
                <p>
                  Candidates must register with accurate personal details and verify ownership of their email address via OTP. Sharing credentials, impersonating another aspirant, or operating duplicate accounts in live contests is prohibited.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">3. Examination Conduct & Fair Play</h3>
                <p>
                  Timed mock papers and live competitions may enforce anti-cheating controls such as tab-switch monitoring, strict submission locks, and negative marking. Automated bots, scraping, inspecting API payloads to obtain answers, or bypassing contest schedules will lead to attempt invalidation and account suspension.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">4. Free & Paid Content (Present and Future)</h3>
                <p>
                  Core practice tests and selected study materials are currently provided free of charge. When paid test series, paid competitions, or paid study notes are offered, applicable fees, access windows, and refund/cancellation terms will be displayed clearly prior to checkout. Unauthorized redistribution or resale of downloaded study notes or test papers is prohibited.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">5. Certificates & Rankings</h3>
                <p>
                  Digital certificates and leaderboard rankings are generated strictly from verified attempt records stored on Evalnium and reflect performance within platform mock assessments only.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">1. Information We Collect</h3>
                <p>
                  When you register or take assessments on Evalnium, we collect account profile information (full name, verified email address, mobile number, city, category, optional institution/designation), exam performance records (responses, scores, timestamps), and basic session security logs (IP address and browser type for rate limiting and audit protection).
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">2. How Your Information Is Used</h3>
                <p>
                  Your data is used strictly to authenticate your account via secure cookies, compute scorecards and candidate rankings, issue verifiable certificates, prevent unauthorized access or exam malpractice, and send essential OTPs or platform exam notices.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">3. Cookies & Session Storage</h3>
                <p>
                  Evalnium uses cryptographically signed, HTTP-only session cookies to keep you signed in securely and local browser storage to preserve live exam progress and bookmarked questions during network interruptions.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">4. Leaderboard Visibility</h3>
                <p>
                  When you participate in ranked assessments, your candidate name, score, accuracy percentage, and completion time may be shown to signed-in participants on the Rankings page. Personal contact fields such as your email address and phone number are never shown publicly on rankings.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">5. Data Security & Account Deletion</h3>
                <p>
                  Passwords are stored using salted cryptographic hashing and never stored in plain text. We do not sell candidate personal data to third parties. To request profile updates or account deletion, contact the platform administrator via the support channels listed on the portal.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
