import React, { useState } from 'react';
import type { Quiz, ParseResult } from '../../types/quiz';
import type { Announcement } from '../../types/announcement';
import { QuizImporter } from './QuizImporter';
import { McqPreviewEditor } from './McqPreviewEditor';
import { AnnouncementManager } from './AnnouncementManager';
import { Plus, Trash2, Eye, EyeOff, FileDown, Layers, Sparkles, Clock, Megaphone } from 'lucide-react';

interface AdminDashboardProps {
  quizzes: Quiz[];
  announcements?: Announcement[];
  onSaveQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string) => void;
  onTogglePublish: (quiz: Quiz) => void;
  onSaveAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  quizzes,
  announcements = [],
  onSaveQuiz,
  onDeleteQuiz,
  onTogglePublish,
  onSaveAnnouncement = () => {},
  onDeleteAnnouncement = () => {},
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'manage' | 'announcements'>('import');
  const [parsedResult, setParsedResult] = useState<{ res: ParseResult; sourceName: string } | null>(null);

  const handleParsed = (res: ParseResult, sourceName: string) => {
    setParsedResult({ res, sourceName });
  };

  const handleSaveAndClear = (quiz: Quiz) => {
    onSaveQuiz(quiz);
    setParsedResult(null);
    setActiveSubTab('manage');
  };

  const handleExportJSON = (quiz: Quiz) => {
    const jsonStr = JSON.stringify(quiz, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_quiz.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (parsedResult) {
    return (
      <McqPreviewEditor
        parseResult={parsedResult.res}
        sourceFileName={parsedResult.sourceName}
        onBack={() => setParsedResult(null)}
        onSaveQuiz={handleSaveAndClear}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <span>Admin Studio & Test Creator</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Convert documents into interactive exams, configure negative marking, and schedule live notices.
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('import')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'import'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Import Document to Quiz
          </button>
          <button
            onClick={() => setActiveSubTab('manage')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'manage'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manage Published Exams ({quizzes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'announcements'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-600" />
            <span>Notice Tickers</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'import' && (
        <QuizImporter onParsedResult={handleParsed} />
      )}

      {activeSubTab === 'announcements' && (
        <AnnouncementManager
          announcements={announcements}
          quizzes={quizzes}
          onSaveAnnouncement={onSaveAnnouncement}
          onDeleteAnnouncement={onDeleteAnnouncement}
        />
      )}

      {activeSubTab === 'manage' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Published Exams Registry</span>
            </h2>
            <button
              onClick={() => setActiveSubTab('import')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Exam</span>
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium text-xs">
              No exams published yet. Click "Import Document to Quiz" above to upload your first exam CSV file.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {quiz.topic}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{quiz.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{quiz.description}</p>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono pt-0.5">
                      <span>{quiz.questions.length} Questions</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{quiz.timeLimitMinutes} Mins</span>
                      </span>
                      <span>•</span>
                      <span>Pass: {quiz.passingPercentage}%</span>
                      {quiz.negativeMarks ? <span className="text-rose-600 font-bold">• Neg: -{quiz.negativeMarks}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onTogglePublish(quiz)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        quiz.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {quiz.isPublished ? (
                        <span className="flex items-center space-x-1"><Eye className="w-3.5 h-3.5" /><span>Published</span></span>
                      ) : (
                        <span className="flex items-center space-x-1"><EyeOff className="w-3.5 h-3.5" /><span>Draft</span></span>
                      )}
                    </button>

                    <button
                      onClick={() => handleExportJSON(quiz)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
                      title="Export JSON"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteQuiz(quiz.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
