import React, { useState } from 'react';
import type { Quiz } from '../../types/quiz';
import { Clock, HelpCircle, Award, ShieldAlert, Play, ArrowLeft, User, Trophy, RefreshCw, BookOpen } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white max-w-xl w-full p-5 sm:p-6 rounded-xl border border-slate-200 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="min-w-0">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-indigo-700">
              {quiz.topic}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{quiz.title}</h2>
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
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/70">
          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>MCQs</span>
            </div>
            <span className="block font-mono font-bold text-base sm:text-lg text-slate-900 mt-0.5 tabular-nums">{quiz.questionCount ?? quiz.questions.length}</span>
          </div>

          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Duration</span>
            </div>
            <span className="block font-mono font-bold text-base sm:text-lg text-slate-900 mt-0.5 tabular-nums">{quiz.timeLimitMinutes} min</span>
          </div>

          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span>Pass Mark</span>
            </div>
            <span className="block font-mono font-bold text-base sm:text-lg text-emerald-700 mt-0.5 tabular-nums">{quiz.passingPercentage}%</span>
          </div>
        </div>

        {/* Exam Type Callout Rule */}
        {quiz.quizType === 'live_contest' ? (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
            <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Live Contest Exam · Strict Single Attempt</span>
            </span>
            <p className="text-amber-900/90 leading-relaxed">
              You get <strong>1 attempt</strong>. Once submitted, your score is locked on the Leaderboard and retakes are disabled.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500 shrink-0" />
            <span><strong className="text-slate-900">Practice Exam:</strong> Unlimited attempts enabled with instant rationale review.</span>
          </div>
        )}

        {/* Exam Rules & Instructions */}
        <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wide mb-2">
            <ShieldAlert className="w-4 h-4 text-slate-600" />
            <span>CBT Examination Rules</span>
          </h4>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600 text-xs">
            <li>The exam countdown timer begins as soon as you click <strong>Begin Test Now</strong>.</li>
            <li>Each question has 4 choices with 1 correct option.</li>
            {quiz.negativeMarks ? <li className="text-rose-700 font-semibold">Negative Marking: -{quiz.negativeMarks} marks deducted for incorrect answers.</li> : null}
            <li>Use the Question Palette on the right to navigate between questions.</li>
            <li>Automatic submission will occur when the timer reaches zero.</li>
            <li>Your scorecard and answer rationale will be generated immediately upon submission.</li>
          </ul>
        </div>

        {/* Candidate Name Input */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Candidate Name</span>
          </label>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-medium text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onStartExam(candidateName || 'Candidate')}
            className={`w-2/3 py-2.5 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isResuming 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {isResuming ? (
              <>
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Resume Examination</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Begin Test Now</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
