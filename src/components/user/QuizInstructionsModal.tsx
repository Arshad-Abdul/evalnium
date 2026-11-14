import React, { useState } from 'react';
import type { Quiz } from '../../types/quiz';
import { 
  Clock, HelpCircle, Award, ShieldAlert, Play, ArrowLeft, User, Trophy, RefreshCw, BookOpen,
  AlertTriangle, RotateCcw, Calendar, Shield, FileCheck, Shuffle, Globe, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface QuizInstructionsModalProps {
  quiz: Quiz;
  defaultCandidateName?: string;
  onCancel: () => void;
  onStartExam: (candidateName: string) => void;
}

export const QuizInstructionsModal: React.FC<QuizInstructionsModalProps> = ({
  quiz,
  defaultCandidateName,
  onCancel,
  onStartExam,
}) => {
  const { currentUser } = useAuth();
  const [candidateName, setCandidateName] = useState(defaultCandidateName || currentUser?.name || 'Candidate');
  
  const isUntimed = !quiz.timeLimitMinutes || quiz.timeLimitMinutes <= 0;
  const hasPassingCutoff = Boolean(quiz.passingPercentage && quiz.passingPercentage > 0);

  const sessionKey = `evalnium_live_exam_${currentUser?.email || candidateName || 'guest'}_${quiz.id}`;
  const [isResuming] = useState(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime) {
          const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
          if (isUntimed || elapsed < (quiz.timeLimitMinutes * 60)) {
            return true;
          }
        }
      }
    } catch {}
    return false;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-3xl w-full p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 shrink-0">
          <div className="min-w-0">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {quiz.topic}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{quiz.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Back to catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-1">
          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Questions</span>
              </div>
              <span className="block font-mono font-bold text-base text-slate-900 mt-0.5 tabular-nums">
                {quiz.questionCount ?? quiz.questions.length} MCQs
              </span>
            </div>

            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Duration</span>
              </div>
              <span className="block font-mono font-bold text-base text-slate-900 mt-0.5 tabular-nums">
                {isUntimed ? 'Untimed (No Limit)' : `${quiz.timeLimitMinutes} Mins`}
              </span>
            </div>

            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>Pass Mark</span>
              </div>
              <span className="block font-mono font-bold text-base text-emerald-700 mt-0.5 tabular-nums">
                {hasPassingCutoff ? `${quiz.passingPercentage}%` : 'No Cutoff (Practice)'}
              </span>
            </div>

            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Negative Mark</span>
              </div>
              <span className={`block font-mono font-bold text-base mt-0.5 tabular-nums ${
                quiz.negativeMarks ? 'text-rose-600' : 'text-slate-600'
              }`}>
                {quiz.negativeMarks ? `-${quiz.negativeMarks}` : 'None'}
              </span>
            </div>
          </div>

          {/* Configured Exam Settings & Rules Grid (All 11+ Granular Settings) */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Configured Exam Rules & Policies</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              
              {/* 1. Timing Rule */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Timing Rule</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {isUntimed 
                      ? 'Untimed Practice Mode (No Countdown - Learn at your own pace)' 
                      : quiz.timingMode === 'sectional' 
                        ? `Sectional Timed (${quiz.sectionalConfig?.length || 2} Sections - ${quiz.preventPreviousSectionReturn ? 'Return Locked' : 'Flexible Navigation'})` 
                        : quiz.timingMode === 'question' 
                          ? `Per-Question Timer (${quiz.questionTimeLimitSeconds || 60}s / MCQ)`
                          : `Full Paper Countdown (${quiz.timeLimitMinutes} Mins - Flexible Navigation)`}
                  </span>
                </div>
              </div>

              {/* 2. Passing & Merit Cutoff */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Passing Criteria</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {hasPassingCutoff 
                      ? `Minimum ${quiz.passingPercentage}% (${Math.ceil((quiz.questions.length * quiz.passingPercentage) / 100)} Marks) required to qualify` 
                      : 'No Passing Cutoff (Open Self-Assessment / Practice Mode)'}
                  </span>
                </div>
              </div>

              {/* 3. Negative Marking Rule */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${quiz.negativeMarks ? 'text-rose-600' : 'text-slate-400'}`} />
                <div>
                  <span className="font-bold text-slate-800 block">Negative Marking</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.negativeMarks && quiz.negativeMarks > 0 
                      ? `-${quiz.negativeMarks} Marks deducted for each incorrect answer` 
                      : 'No Negative Marking (Zero deduction penalty for wrong answers)'}
                  </span>
                </div>
              </div>

              {/* 4. Assessment Mode (Practice vs Formal CBT) */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Assessment Mode</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.enablePracticeMode 
                      ? 'Instant Practice Mode (Answers & rationales displayed immediately after selecting)' 
                      : 'Formal CBT Exam Simulation (Answers revealed upon submission)'}
                  </span>
                </div>
              </div>

              {/* 5. Exam Access & Schedule Window */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Contest & Availability</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.quizType === 'live_contest' 
                      ? 'Strict Live Contest (Strict 1-time scheduled contest)' 
                      : quiz.scheduledStartDateTime 
                        ? `Scheduled Window: ${new Date(quiz.scheduledStartDateTime).toLocaleString()}` 
                        : '24/7 Open On-Demand Access (Attempt anytime)'}
                  </span>
                </div>
              </div>

              {/* 6. Retakes & Attempt Limit */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Retakes & Attempts</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.quizType === 'live_contest' 
                      ? 'Strict Single Attempt Only (No Retakes)' 
                      : quiz.maxAttempts && quiz.maxAttempts > 0 
                        ? `Maximum ${quiz.maxAttempts} Attempt${quiz.maxAttempts === 1 ? '' : 's'} Allowed` 
                        : 'Unlimited Practice Retakes Allowed'}
                  </span>
                </div>
              </div>

              {/* 7. Anti-Cheating & Proctoring Guard */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <Shield className={`w-4 h-4 shrink-0 mt-0.5 ${quiz.enableAntiCheating ? 'text-rose-600' : 'text-slate-400'}`} />
                <div>
                  <span className="font-bold text-slate-800 block">Anti-Cheating Guard</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.enableAntiCheating 
                      ? `Active AI Proctoring (Auto-submit after ${quiz.maxTabSwitches || 3} tab switches)` 
                      : 'Standard Flexible Browsing (Anti-cheating disabled)'}
                  </span>
                </div>
              </div>

              {/* 8. Scorecard & Key Release */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Scorecard & Key</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.resultAnnouncementDateTime 
                      ? `Scheduled Announcement on ${new Date(quiz.resultAnnouncementDateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${new Date(quiz.resultAnnouncementDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                      : 'Instant Scorecard, Percentile Rank & Explanations on submit'}
                  </span>
                </div>
              </div>

              {/* 9. Question & Option Randomization */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <Shuffle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Randomization</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    Questions: {quiz.shuffleQuestions !== false ? 'Shuffled Randomly' : 'Sequential'} • Options: {quiz.shuffleOptions ? 'Shuffled' : 'Standard Sequential (A, B, C, D)'}
                  </span>
                </div>
              </div>

              {/* 10. Display Layout & Language */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
                <Globe className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Display Language</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.defaultLanguageMode === 'dual' 
                      ? 'Dual Language (Side-by-Side English & Hindi)' 
                      : quiz.defaultLanguageMode === 'hi' 
                        ? 'Hindi Language (Bilingual toggle available)' 
                        : 'English Language (Bilingual toggle available)'}
                  </span>
                </div>
              </div>

              {/* 11. Certificate of Merit */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2 sm:col-span-2">
                <FileCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Certificate of Merit</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    {quiz.enableCertificate !== false && hasPassingCutoff 
                      ? `Verifiable Digital Educational Certificate upon scoring ≥ ${quiz.passingPercentage}%` 
                      : 'Scorecard & Performance Analytics Only (No Certificate issued)'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Candidate Name Input */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Candidate Name (Appears on Scorecard & Certificate)</span>
            </label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-medium text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onStartExam(candidateName)}
            className="flex-[2] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {isResuming ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Resume Saved Assessment</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start CBT Assessment</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
