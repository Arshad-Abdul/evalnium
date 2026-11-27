import React, { useState, useEffect } from 'react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';
import { ExamRunner } from '../user/ExamRunner';
import { ExamResultView } from '../user/ExamResultView';
import { Eye, RotateCcw, X } from 'lucide-react';

interface QuizPreviewModalProps {
  quiz: Quiz;
  onClose: () => void;
}

/**
 * Full-screen sandbox preview modal for Admins to test-run any Draft, Scheduled,
 * or Live quiz exactly as students see it, without persisting results or logs.
 */
export const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({ quiz, onClose }) => {
  const [previewResult, setPreviewResult] = useState<QuizAttemptResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleRetake = () => {
    setPreviewResult(null);
    setRunKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto flex flex-col">
      {/* Minimal Institutional Preview Bar */}
      <div className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 shrink-0">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Student Preview</span>
            </span>
            <span className="text-xs font-medium text-slate-300 truncate">
              {quiz.title}
            </span>
            <span
              className={`hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${
                quiz.isPublished
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
              }`}
            >
              {quiz.isPublished ? 'Live' : 'Draft'}
            </span>
            <span className="hidden md:inline text-[11px] text-slate-400 shrink-0">
              — Responses &amp; logs are not saved
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {previewResult && (
              <button
                type="button"
                onClick={handleRetake}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Preview</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Student Exam / Result View */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {!previewResult ? (
          <ExamRunner
            key={runKey}
            quiz={quiz}
            candidateName="Admin Preview"
            isPreview={true}
            onFinishExam={(res) => setPreviewResult(res)}
            onExitExam={onClose}
          />
        ) : (
          <ExamResultView
            result={previewResult}
            quiz={quiz}
            isPreview={true}
            onRetake={handleRetake}
            onGoHome={onClose}
          />
        )}
      </div>
    </div>
  );
};
