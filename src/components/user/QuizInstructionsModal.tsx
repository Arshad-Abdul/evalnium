import React, { useState } from 'react';
import type { Quiz } from '../../types/quiz';
import { Clock, HelpCircle, Award, ShieldAlert, Play, ArrowLeft, User } from 'lucide-react';

interface QuizInstructionsModalProps {
  quiz: Quiz;
  onCancel: () => void;
  onStartExam: (candidateName: string) => void;
}

export const QuizInstructionsModal: React.FC<QuizInstructionsModalProps> = ({
  quiz,
  onCancel,
  onStartExam,
}) => {
  const [candidateName, setCandidateName] = useState('Candidate');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-xl w-full p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {quiz.topic}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{quiz.title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
            <HelpCircle className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <span className="block font-mono font-bold text-lg text-slate-900">{quiz.questions.length}</span>
            <span className="text-xs text-slate-500 font-medium">Total MCQs</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
            <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <span className="block font-mono font-bold text-lg text-amber-700">{quiz.timeLimitMinutes} mins</span>
            <span className="text-xs text-slate-500 font-medium">Time Limit</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
            <Award className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <span className="block font-mono font-bold text-lg text-emerald-700">{quiz.passingPercentage}%</span>
            <span className="text-xs text-slate-500 font-medium">Passing Criteria</span>
          </div>
        </div>

        {/* Exam Rules & Instructions */}
        <div className="space-y-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-900 flex items-center space-x-1.5 text-sm mb-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Computer-Based Test (CBT) Instructions:</span>
          </h4>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>The exam countdown timer begins as soon as you click <strong>Begin Test Now</strong>.</li>
            <li>Each question has 4 choices with 1 correct option.</li>
            <li>Use the Question Palette on the right to navigate between questions.</li>
            <li>Automatic submission will occur when the timer reaches zero.</li>
            <li>Your scorecard and detailed answer rationale will be generated immediately upon submission.</li>
          </ul>
        </div>

        {/* Candidate Name Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center space-x-1">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>Candidate Name</span>
          </label>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => onStartExam(candidateName || 'Candidate')}
            className="w-2/3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all active:scale-98"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Begin Test Now</span>
          </button>
        </div>

      </div>
    </div>
  );
};
