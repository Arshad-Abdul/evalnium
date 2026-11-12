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
                Evalnium LIS Practice Portal · Updated 2026
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
                <h3 className="text-sm font-bold text-slate-900">1. Platform Purpose (LIS Practice Only)</h3>
                <p>
                  Evalnium is an independent educational practice, mock-test, and self-assessment platform focused exclusively on Library &amp; Information Science (LIS) and related librarian competitive examinations (such as UGC NET, CUET, SET, KVS, NVS, DSSSB, and state librarian tests). Evalnium is strictly a learning and practice portal—it is not an official examination authority and is not affiliated with or endorsed by NTA, UGC, or any government or university body.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">2. Account &amp; Registration Information</h3>
                <p>
                  Learners should register using accurate profile details and verify their email address via OTP. Your account is intended for personal study and practice only; sharing login credentials, impersonating another learner, or creating multiple duplicate accounts to manipulate practice leaderboards is not permitted.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">3. Fair Practice &amp; Academic Accuracy</h3>
                <p>
                  Timed mock tests and practice challenges are designed to simulate real exam speed and accuracy. Using automated scripts, bots, content scrapers, or tampering with test timers and platform APIs is prohibited and may lead to attempt removal or account restriction. Practice questions and explanations are curated for educational preparation; while Evalnium strives for accuracy, minor typographical or answer-key variations may occur and are updated as reviewed.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">4. Content Usage &amp; Intellectual Property</h3>
                <p>
                  All mock test papers, MCQs, explanations, and study resources available on Evalnium are provided solely for your personal, non-commercial study and exam preparation. Copying, bulk downloading, republishing, or commercially redistributing platform questions or study materials without prior permission from Evalnium is not permitted.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">5. Practice Scorecards, Rankings &amp; Certificates</h3>
                <p>
                  Scorecards, leaderboard rankings, and completion certificates generated on Evalnium reflect your practice performance within this portal for self-evaluation and motivation only, and do not confer any academic degree, official qualification, or recruitment eligibility.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">1. Information We Collect</h3>
                <p>
                  When you create an account or take practice tests on Evalnium, we collect the profile details you provide (name, verified email address, mobile number, city, candidate category, target exam goal, and optional institution/designation), your practice history (responses, scores, and time spent), and standard technical logs (such as browser/device type and IP address) used strictly for OTP/login security, preventing spam or automated abuse, and platform reliability.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">2. How Your Information Is Used</h3>
                <p>
                  Your information is used strictly to authenticate your account, personalize your Library &amp; Information Science practice experience, generate scorecards and rankings, issue practice certificates, maintain platform security, and deliver essential OTPs or practice test updates.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">3. Cookies &amp; Local Storage</h3>
                <p>
                  Evalnium uses signed, HTTP-only session cookies to keep you safely signed in and browser local storage to preserve active practice progress and bookmarked questions across accidental refreshes or brief network drops.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">4. Leaderboard Visibility</h3>
                <p>
                  When you complete ranked practice tests, your display name, score, accuracy percentage, and time taken may appear to signed-in learners on the Rankings page. Private contact details such as your email address and mobile number are never displayed publicly on leaderboards.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">5. Data Security &amp; Account Requests</h3>
                <p>
                  Passwords are protected using salted cryptographic hashing and are never stored in plain text. Evalnium does not sell learner data to third parties. You may update your profile details anytime from your account settings or contact Evalnium through the portal if you wish to request account deletion.
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
