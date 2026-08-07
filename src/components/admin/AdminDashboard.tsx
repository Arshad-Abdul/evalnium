import React, { useState } from 'react';
import type { Quiz, ParseResult } from '../../types/quiz';
import { QuizImporter } from './QuizImporter';
import { McqPreviewEditor } from './McqPreviewEditor';
import { Plus, Trash2, Eye, EyeOff, FileDown, Layers, Sparkles, Clock, HelpCircle } from 'lucide-react';

interface AdminDashboardProps {
  quizzes: Quiz[];
  onSaveQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string) => void;
  onTogglePublish: (quiz: Quiz) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  quizzes,
  onSaveQuiz,
  onDeleteQuiz,
  onTogglePublish,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'manage'>('import');
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
            <span>Admin Quiz Studio</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              Admin Protected 🔒
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Upload CSV, Markdown, Word DOCX or Text files to convert them into topic-wise MCQs for candidates worldwide.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('import')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeSubTab === 'import'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Upload & Convert Quiz</span>
          </button>

          <button
            onClick={() => setActiveSubTab('manage')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeSubTab === 'manage'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Manage Exams ({quizzes.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'import' ? (
        <QuizImporter onParsedResult={handleParsed} />
      ) : (
        /* Quiz Management Table */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform Exam Library</h2>
              <p className="text-xs text-slate-500 font-medium">Total {quizzes.length} topic exams created</p>
            </div>

            <button
              onClick={() => setActiveSubTab('import')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Import New Document</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Exam Title & Topic</th>
                  <th className="py-3.5 px-4 font-bold">Questions</th>
                  <th className="py-3.5 px-4 font-bold">Time & Pass %</th>
                  <th className="py-3.5 px-4 font-bold">Difficulty</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-base">{quiz.title}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                          {quiz.topic}
                        </span>
                        <span className="text-xs text-slate-400">
                          Updated {new Date(quiz.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1.5 font-mono text-slate-800 font-bold">
                        <HelpCircle className="w-4 h-4 text-indigo-600" />
                        <span>{quiz.questions.length} Questions</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-xs space-y-0.5">
                        <div className="text-slate-800 font-mono flex items-center space-x-1 font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{quiz.timeLimitMinutes} mins</span>
                        </div>
                        <div className="text-slate-500">Pass: {quiz.passingPercentage}%</div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        quiz.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : quiz.difficulty === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {quiz.difficulty}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => onTogglePublish(quiz)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-all ${
                          quiz.isPublished
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {quiz.isPublished ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleExportJSON(quiz)}
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Export Quiz JSON"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteQuiz(quiz.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
