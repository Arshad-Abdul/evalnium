import React from 'react';
import {
  Compass,
  GraduationCap,
  Trophy,
  Clock,
  Languages,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Award,
  BarChart2,
  ArrowLeft,
  FileText,
  MessageSquare,
  Mail,
  ExternalLink,
  Users,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { EvalniumLogo } from '../brand/EvalniumLogo';

interface AboutPageProps {
  onNavigateToCatalog: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToCatalog }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Navigation & Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateToCatalog}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Exam Catalog</span>
        </button>

        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Platform Architecture &amp; Guide
        </span>
      </div>

      {/* Hero Card */}
      <div className="portal-card p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl relative overflow-hidden shadow-md">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <EvalniumLogo size="sm" />
            <span>Official Examination Guide</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
            Evalnium Assessment Portal
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            Evalnium is an open educational Computer-Based Testing (CBT) and Mock Examination platform designed specifically for <strong>Library &amp; Information Science (LIS)</strong> aspirants and competitive examination candidates across India.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-indigo-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> UGC NET &amp; JRF
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> KVS / NVS / EMRS Librarian
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> State SET &amp; PSC Exams
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> DRDO, ISRO &amp; Universities
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: The 4 Exam Modes in Detail */}
      <div className="portal-card p-6 sm:p-7 bg-white border border-slate-200 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Understanding Exam Modes &amp; Access Rules</h2>
            <p className="text-xs text-slate-500">How tests are delivered and how each mode fits your preparation schedule.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode 1 */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-blue-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                24/7 Practice Exam (Evergreen)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase font-mono">Anytime</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Permanent mock tests with immediate access and unlimited practice retakes. Designed for revision of past papers, chapter-wise MCQs, and topic assessments. Your score updates your personal history every time you practice.
            </p>
          </div>

          {/* Mode 2 */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                Scheduled Unlock (Daily Quiz Series)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase font-mono">Countdown</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Features an authentic live countdown timer until the scheduled release time (e.g. 8:00 PM IST). Once the clock strikes the release time, the exam unlocks permanently and remains accessible 24/7 so you never miss a day.
            </p>
          </div>

          {/* Mode 3 */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">3</span>
                Strict Live Contest
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase font-mono">1-Time Window</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simulates genuine competitive examination pressure with a strict start time and closing deadline. Candidates must begin within the window; once the end time arrives, the exam locks permanently. Ranks reflect one-time attempt conditions.
            </p>
          </div>

          {/* Mode 4 */}
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-teal-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">4</span>
                Practice Quiz (No Public Ranking)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase font-mono">Unranked</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Created specifically for exploratory self-study and learning without anxiety. You receive the complete detailed scorecard and bilingual explanations in your Candidate Dashboard, but your score is intentionally excluded from the public leaderboard.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Question Types & Bilingual System */}
      <div className="portal-card p-6 sm:p-7 bg-white border border-slate-200 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Question Types &amp; Bilingual Engine</h2>
            <p className="text-xs text-slate-500">Accurate representation of official NTA CBT interface formats.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <span className="font-bold text-slate-900 block">Single-Choice MCQs</span>
            <p className="text-slate-500 leading-relaxed">Standard 4-option questions with single correct choice selection.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <span className="font-bold text-slate-900 block">Assertion &amp; Reason (A/R)</span>
            <p className="text-slate-500 leading-relaxed">Evaluation of Statement (A) and Reason (R) with standard logical validity pairings.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <span className="font-bold text-slate-900 block">Match List I with List II</span>
            <p className="text-slate-500 leading-relaxed">Pairing column items (theorists, cataloguing codes, classification schemes, years).</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <span className="font-bold text-slate-900 block">Chronological Sequencing</span>
            <p className="text-slate-500 leading-relaxed">Ordering library associations, publications, or IT standards in historical order.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <span className="font-bold text-slate-900 block">Instant Bilingual Translation</span>
            <p className="text-slate-500 leading-relaxed">Switch seamlessly between English and Hindi with 1 click, or view both side-by-side in Dual Mode.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <span className="font-bold text-slate-900 block">Text-to-Speech (Audio)</span>
            <p className="text-slate-500 leading-relaxed">Built-in audio narration of question stems and options for accessible listening.</p>
          </div>
        </div>
      </div>

      {/* Section 3: Scoring & Negative Marking Rules */}
      <div className="portal-card p-6 sm:p-7 bg-white border border-slate-200 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Scoring, Negative Marking &amp; Qualifying Criteria</h2>
            <p className="text-xs text-slate-500">Every examination specifies its exact rules before you start.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <span className="font-bold text-slate-900 text-xs block">Passing Percentage</span>
            <p className="text-slate-600 leading-relaxed">
              Configured per examination (typically 40% for General / 35% for reserved criteria). Qualifying awards an educational digital certificate.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <span className="font-bold text-slate-900 text-xs block">Zero Negative Marking</span>
            <p className="text-slate-600 leading-relaxed">
              Standard for UGC NET Paper II. Incorrect attempts do not deduct marks, allowing candidates to attempt all questions freely.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <span className="font-bold text-slate-900 text-xs block">Custom Negative Penalties</span>
            <p className="text-slate-600 leading-relaxed">
              For DSSSB, KVS, NVS, and State PSC papers, negative marks (-0.25 or -0.33) are applied to teach calculated risk-taking and accuracy.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Rankings & Anti-Cheating Integrity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Rankings Engine */}
        <div className="portal-card p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Leaderboards &amp; Percentile Engine</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Public rankings are generated strictly from ranked tests (24/7 Practice, Daily Quizzes, and Live Contests). Ranking order is determined by:
          </p>
          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
            <li><strong>Score &amp; Percentage:</strong> Highest raw marks and accuracy.</li>
            <li><strong>Time Efficiency:</strong> Faster completion breaks ties between identical scores.</li>
            <li><strong>Percentile Benchmark:</strong> Measures your performance against all candidates who have taken the paper.</li>
          </ul>
        </div>

        {/* Anti-Cheating Protection */}
        <div className="portal-card p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Anti-Cheating &amp; Examination Integrity</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            To ensure rankings reflect authentic academic preparation, the portal incorporates proctoring safeguards:
          </p>
          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
            <li><strong>Tab-Switch Monitoring:</strong> Tracks candidate focus with automatic warnings if you navigate away.</li>
            <li><strong>Clipboard &amp; Screenshot Guards:</strong> Prevents question copy-paste during live timed exams.</li>
            <li><strong>Forensic Watermarking:</strong> Subtle candidate identifier overlay discouraging screen capture sharing.</li>
          </ul>
        </div>
      </div>

      {/* Section 5: Question Doubts & Community Discussions */}
      <div className="portal-card p-6 sm:p-7 bg-white border border-slate-200 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Question Doubts &amp; Discussion Hub</h2>
            <p className="text-xs text-slate-500">Ask questions directly where you study.</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Found an ambiguous question, want clarification on a classification rule, or have a memory shortcut to share?
          Every question in the post-exam review features an integrated <strong>Discussion &amp; Doubts Hub</strong>.
          Candidates can post questions, vote helpful replies, and receive verified answers from faculty members marked with the <strong className="text-indigo-600">Verified Faculty</strong> badge.
        </p>
      </div>

      {/* Section 6: Paper Submission & Platform Feedback (Google Forms) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Submit Paper Card */}
        <div className="p-5 sm:p-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white space-y-3">
          <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Submit PYQ / Custom Practice Papers</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you an aspirant, educator, or study group with previous year question papers (UGC NET, KVS, State SET) or specialized topic quizzes you'd like to practice in CBT format?
          </p>
          <p className="text-xs text-slate-600">
            You can choose whether your paper is public for all aspirants, restricted to your study friends, or private for you only.
          </p>
          <a
            href="https://forms.gle/VCGQKcT5yAuYNkrg6"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>Submit Papers via Google Form</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Feedback Card */}
        <div className="p-5 sm:p-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white space-y-3">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Platform Feedback &amp; Suggestions</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Evalnium is continuously evolving to help LIS students succeed. If you noticed a bug, have a feature suggestion, or want to share your experience, we would love to hear from you.
          </p>
          <p className="text-xs text-slate-600">
            Your feedback directly shapes our new quiz modes, user interface, and question database.
          </p>
          <a
            href="https://forms.gle/r1K6pgTie8TaiyYG8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>Share Feedback via Google Form</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Official Contact & Academic Support */}
      <div className="portal-card p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>Official Portal Academic &amp; Technical Support</span>
          </span>
          <p className="text-xs text-slate-500">
            For account queries, exam assistance, or institutional partnerships, reach out directly:
          </p>
        </div>

        <a
          href="mailto:evalniumlis@gmail.com"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-mono text-xs font-bold transition-all shadow-2xs shrink-0"
        >
          <Mail className="w-3.5 h-3.5 text-indigo-600" />
          <span>evalniumlis@gmail.com</span>
        </a>
      </div>

    </div>
  );
};

