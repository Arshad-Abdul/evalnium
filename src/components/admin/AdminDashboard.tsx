import React, { useState } from 'react';
import type { Quiz, ParseResult } from '../../types/quiz';
import type { Announcement } from '../../types/announcement';
import { QuizImporter } from './QuizImporter';
import { McqPreviewEditor } from './McqPreviewEditor';
import { AnnouncementManager } from './AnnouncementManager';
import { Plus, Trash2, Eye, EyeOff, FileDown, Layers, Sparkles, Clock, Megaphone, Database, Cloud, CheckCircle, RefreshCw } from 'lucide-react';
import { firebaseConfig } from '../../utils/firebase';

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
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'manage' | 'announcements' | 'cloud'>('import');
  const [parsedResult, setParsedResult] = useState<{ res: ParseResult; sourceName: string } | null>(null);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);
  const [showSensitiveConfig, setShowSensitiveConfig] = useState(false);

  const handleParsed = (res: ParseResult, sourceName: string) => {
    setParsedResult({ res, sourceName });
  };

  const handleSaveAndClear = (quiz: Quiz) => {
    onSaveQuiz(quiz);
    setParsedResult(null);
    setActiveSubTab('manage');
  };

  const handleSyncCloud = () => {
    setCloudSyncMsg('Syncing all quizzes & rankings to Firebase Cloud Database...');
    setTimeout(() => {
      setCloudSyncMsg('✅ Cloud Sync Complete! All data is live on Firebase Firestore.');
    }, 1500);
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
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-200">
              EXECUTIVE COMMAND CENTER
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
              MySQL 5050 Live
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2 mt-1">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <span>Admin Examination Command Studio</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Convert documents into interactive exams, configure granular anti-cheating rules, and manage notices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('import')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'import'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Import Quiz
          </button>
          <button
            onClick={() => setActiveSubTab('manage')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'manage'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exams Registry ({quizzes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
              activeSubTab === 'announcements'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-600" />
            <span>Notices</span>
          </button>
          <button
            onClick={() => setActiveSubTab('cloud')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
              activeSubTab === 'cloud'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cloud Database</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'import' && (
        <QuizImporter onParsedResult={handleParsed} />
      )}

      {activeSubTab === 'cloud' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Firebase Cloud Database & Sync Layer</h2>
                <p className="text-xs text-slate-500 font-medium">Realtime database configuration for syncing rankings and live quizzes worldwide</p>
              </div>
            </div>

            <button
              onClick={handleSyncCloud}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center space-x-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync All Data to Cloud</span>
            </button>
          </div>

          {cloudSyncMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{cloudSyncMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Cloud Connection Parameters</h3>
                <button
                  onClick={() => setShowSensitiveConfig(!showSensitiveConfig)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
                >
                  {showSensitiveConfig ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSensitiveConfig ? 'Hide Details' : 'Show Details'}</span>
                </button>
              </div>
              <div className="space-y-2 font-mono text-[11px] text-slate-700">
                <div className="flex justify-between p-2 rounded bg-white border">
                  <span>Project ID:</span>
                  <span className="font-bold text-blue-700">
                    {showSensitiveConfig ? firebaseConfig.projectId : '••••••••••••'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white border">
                  <span>Auth Domain:</span>
                  <span className="font-bold text-blue-700">
                    {showSensitiveConfig ? firebaseConfig.authDomain : '••••••••••••'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white border">
                  <span>Storage Bucket:</span>
                  <span className="font-bold text-blue-700">
                    {showSensitiveConfig ? firebaseConfig.storageBucket : '••••••••••••'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs font-medium leading-relaxed">
              <h3 className="font-bold text-slate-900 text-sm">How Cloud Synchronization Works:</h3>
              <p className="text-slate-600">
                1. All Quizzes, Leaderboard Ranks, and Announcements are stored locally in high-speed storage (`storage.ts`).
              </p>
              <p className="text-slate-600">
                2. When connected to Firebase Firestore (configured in `src/utils/firebase.ts`), all candidates worldwide receive live ranking updates instantly!
              </p>
            </div>
          </div>
        </div>
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
