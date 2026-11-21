import React, { useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Scale,
  ShieldAlert,
  FileText,
  Mail,
  ExternalLink,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  Layers,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { EvalniumLogo } from '../brand/EvalniumLogo';

interface AboutPageProps {
  onNavigateToCatalog: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToCatalog }) => {
  const modesRef = useRef<HTMLDivElement>(null);
  const scoringRef = useRef<HTMLDivElement>(null);
  const formatsRef = useRef<HTMLDivElement>(null);
  const integrityRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Return to Examination Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Candidate Information Bulletin &amp; Portal Guidelines</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Evalnium Online Computer-Based Testing (CBT) Assessment Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
            Edition 2026.1
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline font-mono text-[11px]">Library &amp; Information Science</span>
        </div>
      </div>

      {/* Quick Jump Navigation Strip */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold text-slate-700">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono px-2 shrink-0">
          Sections:
        </span>
        <button
          type="button"
          onClick={() => scrollTo(modesRef)}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
        >
          📊 Exam Modes Table
        </button>
        <button
          type="button"
          onClick={() => scrollTo(scoringRef)}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
        >
          ⚖️ Marking &amp; Negative Scores
        </button>
        <button
          type="button"
          onClick={() => scrollTo(formatsRef)}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
        >
          📝 Question Formats
        </button>
        <button
          type="button"
          onClick={() => scrollTo(integrityRef)}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
        >
          🛡️ Proctoring &amp; Fair Play
        </button>
        <button
          type="button"
          onClick={() => scrollTo(submitRef)}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
        >
          📄 Submit Papers &amp; Feedback
        </button>
      </div>

      {/* Section 1: Platform Purpose & Scope */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-2.5">
          <BookOpen className="w-4 h-4 text-slate-700" />
          <h2>1. Platform Purpose &amp; Academic Scope</h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          <strong>Evalnium</strong> is an independent educational Computer-Based Testing (CBT) portal designed to provide high-fidelity mock exam practice for students, scholars, and professionals in <strong>Library &amp; Information Science (LIS)</strong> across India.
        </p>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          The platform replicates the exact interface, timing conditions, and navigation palette used in official National Testing Agency (NTA) examinations. Our paper repository spans:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">UGC NET / JRF (Paper II)</span>
            <p className="text-slate-600 leading-snug">Information Sources, Knowledge Organization (DDC, UDC, CC), Library Automation &amp; Research Pedagogy.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">KVS / NVS / EMRS School Librarians</span>
            <p className="text-slate-600 leading-snug">Direct recruitment exams with library management and school administration syllabus.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">State SET &amp; PSC Commissions</span>
            <p className="text-slate-600 leading-snug">State eligibility papers (MHSET, GSET, KSET, JKSET) and Public Service Commission Librarian posts.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Central Universities &amp; Labs</span>
            <p className="text-slate-600 leading-snug">Recruitment assessments for DRDO, ISRO, CSIR, and Central University Library Professional Assistants.</p>
          </div>
        </div>
      </div>

      {/* Section 2: Examination Modes Comparison Table */}
      <div ref={modesRef} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
            <Clock className="w-4 h-4 text-slate-700" />
            <h2>2. Examination Modes Comparison Table</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">4 Operational Modes</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Every examination hosted on Evalnium operates under one of four designated access modes. Refer to the table below to understand timing, retake policies, and ranking rules before beginning a test:
        </p>

        {/* Comparison Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Exam Mode</th>
                <th className="p-3">Availability &amp; Access</th>
                <th className="p-3">Attempt Policy</th>
                <th className="p-3">Leaderboard Impact</th>
                <th className="p-3">Primary Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                  🌐 24/7 Practice Exam
                </td>
                <td className="p-3">Immediate 24/7 access; no schedule restriction.</td>
                <td className="p-3">Unlimited retakes. Every attempt records performance history.</td>
                <td className="p-3 font-medium text-emerald-800">
                  Published on public rankings.
                </td>
                <td className="p-3 text-slate-600">Evergreen revision of past papers and chapter-wise tests at candidate pace.</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                  ⏰ Scheduled Daily Quiz
                </td>
                <td className="p-3">Features live countdown until set launch time; unlocks permanently 24/7 thereafter.</td>
                <td className="p-3">Unlimited practice retakes after initial unlock.</td>
                <td className="p-3 font-medium text-emerald-800">
                  Published on public rankings.
                </td>
                <td className="p-3 text-slate-600">Daily practice series (e.g. daily 8:00 PM LIS tests) so candidates maintain continuous study discipline.</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                  🏆 Strict Live Contest
                </td>
                <td className="p-3">Strict start time and closing deadline. Test auto-locks permanently upon window expiry.</td>
                <td className="p-3 font-semibold text-amber-900">
                  1-Time attempt only. No retakes permitted.
                </td>
                <td className="p-3 font-medium text-emerald-800">
                  Rankings reflect true one-shot exam pressure.
                </td>
                <td className="p-3 text-slate-600">State-level competitions and mock exam drives testing real examination hall stamina.</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors bg-slate-50/30">
                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                  🛡️ Practice Quiz (Unranked)
                </td>
                <td className="p-3">Immediate 24/7 access; unlimited trial attempts.</td>
                <td className="p-3">Unlimited retakes. Complete solutions visible on candidate scorecard.</td>
                <td className="p-3 font-semibold text-slate-500">
                  Excluded from public leaderboard.
                </td>
                <td className="p-3 text-slate-600">Stress-free self-study and private assessment where scores are visible only to the candidate.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Scoring & Negative Marking Rules */}
      <div ref={scoringRef} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-2.5">
          <Scale className="w-4 h-4 text-slate-700" />
          <h2>3. Scoring Rules &amp; Negative Marking Calculations</h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          Scores on Evalnium are calculated strictly according to the official rules configured for each paper:
        </p>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900">
          <strong>Standard Score Formula:</strong> Final Marks = (Correct Answers × Marks per Question) − (Incorrect Answers × Negative Deduction Penalty)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="font-bold text-slate-900 block">0 Negative Marks (UGC NET)</span>
            <p className="text-slate-600 leading-relaxed">
              Standard format for UGC NET Paper II. Candidates receive 0 marks deduction for wrong responses. Candidates are advised to attempt all questions.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="font-bold text-slate-900 block">−0.25 Marks (1/4th Penalty)</span>
            <p className="text-slate-600 leading-relaxed">
              Applicable to KVS, NVS, and DSSSB Librarian tests. Every four wrong answers cancel out one correct response.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="font-bold text-slate-900 block">−0.33 Marks (1/3rd Penalty)</span>
            <p className="text-slate-600 leading-relaxed">
              Standard for various State PSC and Polytechnic examinations (e.g. RPSC, MPPSC) where accuracy must be maintained with high precision.
            </p>
          </div>
        </div>

        {/* Practical Example Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
          <span className="font-bold text-slate-900 block">
            Practical Calculation Example (100 Questions Paper, −0.25 Penalty):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-700">
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px]">CORRECT</span>
              <span className="font-bold text-emerald-700">70 (+70.0)</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px]">INCORRECT</span>
              <span className="font-bold text-rose-700">20 (−5.0)</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px]">UNATTEMPTED</span>
              <span className="font-bold text-slate-700">10 (0.0)</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px]">NET FINAL SCORE</span>
              <span className="font-bold text-slate-950">65.00 / 100 (65%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Question Formats & Bilingual Engine */}
      <div ref={formatsRef} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-2.5">
          <Layers className="w-4 h-4 text-slate-700" />
          <h2>4. Supported Question Formats &amp; Accessibility</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Single-Choice Multiple Choice (MCQ)</strong>
            <p className="text-slate-600">Standard 4-option objective questions with one correct key.</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Assertion &amp; Reason (A/R)</strong>
            <p className="text-slate-600">Evaluates conceptual logic between Statement (A) and Reason (R).</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Match List I with List II</strong>
            <p className="text-slate-600">Standard classification, author, or committee pairing tables.</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Chronological Sequencing</strong>
            <p className="text-slate-600">Ordering library acts, cataloguing codes, and standards in year order.</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Instant Bilingual Switch</strong>
            <p className="text-slate-600">1-Click toggle between English, Hindi, and Dual side-by-side mode.</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Text-to-Speech (TTS) Narration</strong>
            <p className="text-slate-600">Audio playback of questions and options for accessible listening practice.</p>
          </div>
        </div>
      </div>

      {/* Section 5: Proctoring & Fair Play */}
      <div ref={integrityRef} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-700" />
          <h2>5. Proctoring Safeguards &amp; Candidate Fair Play</h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          To maintain fair rankings and simulate authentic examination discipline, the following proctoring rules are enforced during timed assessments:
        </p>

        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside bg-slate-50 p-4 rounded-lg border border-slate-200">
          <li><strong>Tab-Switch Monitoring:</strong> Navigating away from the exam tab triggers an immediate warning. Reaching the paper's maximum allowed switches automatically locks and submits the examination.</li>
          <li><strong>Copy-Paste Restrictions:</strong> Question stems and answer options cannot be copied during an active examination.</li>
          <li><strong>Forensic Watermarking:</strong> Tests render a subtle candidate verification watermark to discourage unauthorized screen captures.</li>
        </ul>
      </div>

      {/* Section 6: Paper Submission & Feedback Forms */}
      <div ref={submitRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Paper Submission */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3>Submit Previous Year Papers (PYQ)</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you an aspirant, educator, or study group with question papers you want converted into interactive CBT tests?
            Submit your papers via our official Google Form. You can specify whether the test should be public for all, restricted to your study friends, or private for your personal practice.
          </p>
          <a
            href="https://forms.gle/VCGQKcT5yAuYNkrg6"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>Open Paper Submission Form</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Feedback Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-slate-700" />
            <h3>Platform Feedback &amp; Suggestions</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Evalnium is continuously improved based on candidate feedback. If you noticed an issue, have a syllabus request, or wish to suggest a feature, please share your thoughts via our feedback form.
          </p>
          <a
            href="https://forms.gle/r1K6pgTie8TaiyYG8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>Open Platform Feedback Form</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Official Academic Contact Footer */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-slate-900 block">
            Official Academic &amp; Technical Support
          </span>
          <p className="text-[11px] text-slate-500">
            For account queries, verification assistance, or institutional mock partnerships:
          </p>
        </div>

        <a
          href="mailto:evalniumlis@gmail.com"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-white text-slate-900 font-mono text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <Mail className="w-3.5 h-3.5 text-slate-600" />
          <span>evalniumlis@gmail.com</span>
        </a>
      </div>

    </div>
  );
};
