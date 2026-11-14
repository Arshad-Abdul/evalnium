import React from 'react';
import { 
  X, BookOpen, Award, Shield, CheckCircle2, Trophy, Clock, Languages, 
  HelpCircle, MessageSquare, BarChart2, GraduationCap, Building2, Compass
} from 'lucide-react';
import { EvalniumLogo } from '../brand/EvalniumLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white max-w-3xl w-full rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[90vh] flex flex-col">
        
        {/* Top Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <EvalniumLogo size="md" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">About Evalnium Portal</h2>
              <p className="text-[11px] text-slate-500 font-medium">India's Dedicated CBT Assessment Platform for LIS Aspirants</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm">
          
          {/* Mission Intro */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 space-y-1.5">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Platform Mission</span>
            </span>
            <p className="leading-relaxed text-xs sm:text-sm text-indigo-950/90">
              <strong>Evalnium</strong> is a specialized, open-practice Computer-Based Testing (CBT) and Mock Examination ecosystem engineered specifically for <strong>Library & Information Science (LIS)</strong> students and competitive examination aspirants across India. We bridge the gap between academic theory and high-stakes recruitment tests through authentic CBT simulations.
            </p>
          </div>

          {/* Target Examinations Covered */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Target Examinations & Syllabus Coverage</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">UGC NET / JRF (LIS Paper II)</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Comprehensive mock test series covering Information Sources, Knowledge Organization (CC, DDC, UDC), Research Methodology, and Library Automation.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">KVS / NVS / EMRS Librarian Exams</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  School and institutional library recruitment assessments with general aptitude and core library management pedagogy.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">State PSC & SET Librarian Tests</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Aligned with state eligibility and commission examinations (KPSC, MPPSC, RPSC, TNPSC, WBPSC, GSET, MHSET, JKSET).
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">Scientific & Research Institutes</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Targeted papers for ISRO, PRL, DRDO, BARC, CSIR, and Central University Library Assistant recruitments.
                </p>
              </div>
            </div>
          </div>

          {/* Key Platform Features */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-600" />
              <span>Core CBT Technology & Student Features</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 block text-xs">Authentic NTA CBT Interface</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Interactive Question Palette, Mark for Review, and strict Sectional Countdown timers.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <Languages className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 block text-xs">Bilingual Support (English & Hindi)</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Switch instantly between English and Hindi or view both side-by-side in Dual Mode.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 block text-xs">Negative Marking & Rules</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Exact negative mark deductions (-0.25) and decimal grading matching official boards.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 block text-xs">Detailed Answer Rationales</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Comprehensive standard answer keys and explanations provided for every single MCQ.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <Award className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 block text-xs">Verifiable Practice Certificates</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Earn digital educational achievement certificates with secure verification IDs.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 block text-xs">Leaderboard & Analytics</span>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Compare your percentile, track topic-wise accuracy, and identify weak focus areas.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Evalnium Assessment Portal · Educational Practice Platform
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};

