import React, { useState } from 'react';
import type { Quiz } from '../../types/quiz';
import { 
  Clock, HelpCircle, Award, ShieldAlert, Play, ArrowLeft, User, Trophy, RefreshCw, BookOpen,
  AlertTriangle, RotateCcw, Calendar, Shield, FileCheck
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
  
  const sessionKey = `evalnium_live_exam_${currentUser?.email || candidateName || 'guest'}_${quiz.id}`;
  const [isResuming] = useState(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime) {
          const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
          if (elapsed < (quiz.timeLimitMinutes * 60)) {
            return true;
          }
        }
      }
    } catch {}
    return false;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-2xl w-full p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
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
              {quiz.timeLimitMinutes} Mins
            </span>
          </div>

          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span>Pass Mark</span>
            </div>
            <span className="block font-mono font-bold text-base text-emerald-700 mt-0.5 tabular-nums">
              {quiz.passingPercentage}%
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

        {/* Configured Exam Settings & Rules Grid */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Configured Exam Rules & Policies</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Timing Mode */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Timing Rule</span>
                <span className="text-slate-600 text-[11px]">
                  {quiz.timingMode === 'sectional' 
                    ? `Sectional Timed (${quiz.sectionalConfig?.length || 2} Sections)` 
                    : quiz.timingMode === 'question' 
                      ? `Per-Question Timer (${quiz.questionTimeLimitSeconds || 60}s / MCQ)`
                      : 'Full Paper Timer (Flexible Navigation)'}
                </span>
              </div>
            </div>

            {/* Attempts Policy */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Retakes & Attempts</span>
                <span className="text-slate-600 text-[11px]">
                  {quiz.quizType === 'live_contest' 
                    ? 'Strict Single Attempt (Live Contest)' 
                    : quiz.maxAttempts && quiz.maxAttempts > 0 
                      ? `Maximum ${quiz.maxAttempts} Attempt${quiz.maxAttempts === 1 ? '' : 's'} Allowed` 
                      : 'Unlimited Practice Retakes Allowed'}
                </span>
              </div>
            </div>

            {/* Anti-Cheating Proctoring */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
              <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Anti-Cheating Guard</span>
                <span className="text-slate-600 text-[11px]">
                  {quiz.enableAntiCheating 
                    ? `Active Proctoring (Max ${quiz.maxTabSwitches || 3} Tab Switches)`
                    : 'Standard Browser Mode'}
                </span>
              </div>
            </div>

            {/* Result Announcement */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Scorecard & Key</span>
                <span className="text-slate-600 text-[11px]">
                  {quiz.resultAnnouncementDateTime 
                    ? `Announced on ${new Date(quiz.resultAnnouncementDateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${new Date(quiz.resultAnnouncementDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Instant Scorecard, Rank & Explanations on submit'}
                </span>
              </div>
            </div>

            {/* Assessment Mode */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Assessment Mode</span>
                <span className="text-slate-600 text-[11px]">
                  {quiz.enablePracticeMode 
                    ? 'Instant Practice Mode (Explanations during test)' 
                    : 'Formal CBT Examination Simulation'}
                </span>
              </div>
            </div>

            {/* Certificate */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Certificate of Merit</span>
                <span className="text-slate-600 text-[11px]">
                  {quiz.enableCertificate !== false 
                    ? `Verifiable Practice Certificate upon scoring ≥ ${quiz.passingPercentage}%`
                    : 'Scorecard Only (No Certificate)'}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onStartExam(candidateName || 'Candidate')}
            className={`w-2/3 py-2.5 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md ${
              isResuming 
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
            }`}
          >
            {isResuming ? (
              <>
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Resume Examination</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-white" />
                <span>Begin Examination Now</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
