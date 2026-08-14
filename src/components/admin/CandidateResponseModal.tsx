import React from 'react';
import { X, Check, XCircle, MinusCircle, AlertCircle } from 'lucide-react';
import type { Quiz, QuizAttemptResult } from '../../types/quiz';

interface CandidateResponseModalProps {
  attemptResult: QuizAttemptResult;
  quiz: Quiz | null;
  onClose: () => void;
}

export const CandidateResponseModal: React.FC<CandidateResponseModalProps> = ({ attemptResult, quiz, onClose }) => {
  if (!quiz) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quiz Not Found</h3>
            <p className="text-sm text-slate-500 mt-1">The original exam data for this attempt has been deleted or is unavailable. Responses cannot be rendered.</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl w-full">Close</button>
        </div>
      </div>
    );
  }

  // Pre-calculate correct/wrong for each question
  const responseData = quiz.questions.map((q, idx) => {
    const answer = attemptResult.userAnswers[q.id];
    let status: 'correct' | 'wrong' | 'skipped' = 'skipped';
    
    if (answer && answer.selectedOptionId) {
      if (answer.selectedOptionId === q.correctOptionId) {
        status = 'correct';
      } else {
        status = 'wrong';
      }
    } else if (answer && answer.selectedOptionIds && answer.selectedOptionIds.length > 0) {
      // MSQ logic
      const selectedSorted = [...answer.selectedOptionIds].sort();
      const correctSorted = [...(q.correctOptionIds || [q.correctOptionId])].sort();
      if (JSON.stringify(selectedSorted) === JSON.stringify(correctSorted)) {
        status = 'correct';
      } else {
        status = 'wrong';
      }
    }

    return { q, answer, status, idx };
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-w-5xl w-full mx-auto h-full overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              Candidate Responses
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              <span className="font-bold text-indigo-700">{attemptResult.candidateName}</span> • {attemptResult.quizTitle} • {new Date(attemptResult.attemptedAt).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors shadow-sm border border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Summary Banner */}
        <div className="bg-indigo-900 text-white px-6 py-3 flex items-center justify-between text-xs font-bold flex-shrink-0 shadow-inner">
          <div className="flex space-x-6">
            <span>Score: <span className="font-mono text-indigo-200">{attemptResult.score} / {attemptResult.maxScore}</span></span>
            <span>Percentage: <span className="font-mono text-indigo-200">{attemptResult.percentage}%</span></span>
            <span>Result: <span className={`px-2 py-0.5 rounded ml-1 ${attemptResult.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{attemptResult.passed ? 'PASSED' : 'FAILED'}</span></span>
          </div>
          <div className="flex space-x-4">
            <span className="flex items-center space-x-1"><Check className="w-3.5 h-3.5 text-emerald-400"/> <span>{attemptResult.correctAnswers}</span></span>
            <span className="flex items-center space-x-1"><XCircle className="w-3.5 h-3.5 text-rose-400"/> <span>{attemptResult.wrongAnswers}</span></span>
            <span className="flex items-center space-x-1"><MinusCircle className="w-3.5 h-3.5 text-amber-400"/> <span>{attemptResult.skippedQuestions}</span></span>
          </div>
        </div>

        {/* Responses List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {responseData.map(({ q, answer, status, idx }) => (
            <div key={q.id} className={`rounded-xl border shadow-sm bg-white overflow-hidden ${
              status === 'correct' ? 'border-emerald-200' :
              status === 'wrong' ? 'border-rose-200' : 'border-amber-200'
            }`}>
              
              {/* Question Header */}
              <div className={`px-4 py-2 border-b flex justify-between items-center ${
                status === 'correct' ? 'bg-emerald-50 border-emerald-100' :
                status === 'wrong' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  status === 'correct' ? 'text-emerald-700' :
                  status === 'wrong' ? 'text-rose-700' : 'text-amber-700'
                }`}>
                  Question {idx + 1}
                </span>
                
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${
                  status === 'correct' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' :
                  status === 'wrong' ? 'bg-rose-100 border-rose-200 text-rose-800' : 'bg-amber-100 border-amber-200 text-amber-800'
                }`}>
                  {status === 'correct' && <Check className="w-3 h-3" />}
                  {status === 'wrong' && <XCircle className="w-3 h-3" />}
                  {status === 'skipped' && <MinusCircle className="w-3 h-3" />}
                  <span>{status.toUpperCase()}</span>
                </span>
              </div>

              {/* Question Content */}
              <div className="p-4 space-y-4">
                <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">{q.questionText}</p>
                {q.imageUrl && <img src={q.imageUrl} alt="Question Graphic" className="max-h-48 rounded-lg border border-slate-200" />}

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {q.options.map(opt => {
                    const isCorrect = q.correctOptionIds ? q.correctOptionIds.includes(opt.id) : q.correctOptionId === opt.id;
                    const isSelected = answer?.selectedOptionIds ? answer.selectedOptionIds.includes(opt.id) : answer?.selectedOptionId === opt.id;
                    
                    let bgClass = "bg-slate-50 border-slate-200 text-slate-700";
                    let icon = null;

                    if (isCorrect && isSelected) {
                      bgClass = "bg-emerald-100 border-emerald-300 text-emerald-900";
                      icon = <Check className="w-4 h-4 text-emerald-600" />;
                    } else if (isCorrect && !isSelected) {
                      bgClass = "bg-emerald-50 border-emerald-300 text-emerald-700 border-dashed"; // Show what they SHOULD have picked
                    } else if (!isCorrect && isSelected) {
                      bgClass = "bg-rose-100 border-rose-300 text-rose-900"; // What they got wrong
                      icon = <XCircle className="w-4 h-4 text-rose-600" />;
                    }

                    return (
                      <div key={opt.id} className={`flex p-3 rounded-xl border ${bgClass}`}>
                        <div className="flex-shrink-0 mr-3 flex flex-col items-center">
                           <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black border bg-white ${isCorrect ? 'border-emerald-300 text-emerald-600' : isSelected ? 'border-rose-300 text-rose-600' : 'border-slate-300 text-slate-500'}`}>
                              {opt.id}
                           </span>
                           {icon && <div className="mt-1">{icon}</div>}
                        </div>
                        <div className="text-sm font-medium pt-0.5">{opt.text}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
