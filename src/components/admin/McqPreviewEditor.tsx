import React, { useState } from 'react';
import type { ParsedQuestion, ParseResult, Quiz, DifficultyLevel } from '../../types/quiz';
import { Trash2, Plus, ArrowLeft, Save, Sparkles, HelpCircle, Layers, Clock, Award, Shuffle, ShieldAlert } from 'lucide-react';

interface McqPreviewEditorProps {
  parseResult: ParseResult;
  sourceFileName: string;
  onBack: () => void;
  onSaveQuiz: (quiz: Quiz) => void;
}

export const McqPreviewEditor: React.FC<McqPreviewEditorProps> = ({
  parseResult,
  sourceFileName,
  onBack,
  onSaveQuiz,
}) => {
  const [title, setTitle] = useState(parseResult.title || sourceFileName.replace(/\.[^/.]+$/, ''));
  const [topic, setTopic] = useState(parseResult.topic || 'General Knowledge');
  const [category] = useState('General');
  const [description, setDescription] = useState(`Comprehensive assessment covering ${parseResult.questions.length} MCQs.`);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.25);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [enablePracticeMode, setEnablePracticeMode] = useState(false);
  const [quizType, setQuizType] = useState<'practice' | 'live_contest'>('practice');
  const [scheduledStartDateTime, setScheduledStartDateTime] = useState<string>('');
  const [scheduledEndDateTime, setScheduledEndDateTime] = useState<string>('');

  // --- Granular Admin Settings & Rules ---
  const [enableCertificate, setEnableCertificate] = useState(true);
  const [enableAntiCheating, setEnableAntiCheating] = useState(false);
  const [timingMode, setTimingMode] = useState<'quiz' | 'sectional' | 'question'>('quiz');
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState(60);
  const [preventPreviousSectionReturn, setPreventPreviousSectionReturn] = useState(false);
  const [preventEarlyNextSection, setPreventEarlyNextSection] = useState(false);
  const [preventPreviousQuestionReturn, setPreventPreviousQuestionReturn] = useState(false);
  const [preventEarlyNextQuestion, setPreventEarlyNextQuestion] = useState(false);
  const [sections, setSections] = useState<Array<{
    id: string;
    sectionName: string;
    questionCount: number;
    timeLimitMinutes: number;
  }>>([
    { id: 'sec_1', sectionName: 'Section 1: General Aptitude', questionCount: Math.ceil(parseResult.questions.length / 2), timeLimitMinutes: 10 },
    { id: 'sec_2', sectionName: 'Section 2: Technical Domain', questionCount: Math.floor(parseResult.questions.length / 2), timeLimitMinutes: 20 },
  ]);

  const [questions, setQuestions] = useState<ParsedQuestion[]>(() => {
    return parseResult.questions.map((q) => {
      const opts = (q.options && q.options.length > 0) ? q.options : [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ];
      return {
        ...q,
        options: opts,
        correctOptionId: q.correctOptionId || 'A',
      };
    });
  });

  const handleAddOptionToQuestion = (qId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.tempId !== qId) return q;
      const nextChar = String.fromCharCode(65 + q.options.length); // e.g. E, F
      return {
        ...q,
        options: [...q.options, { id: nextChar, text: '' }],
      };
    }));
  };

  const handleGenerateDefaultOptions = (qId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.tempId !== qId) return q;
      return {
        ...q,
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correctOptionId: 'A',
      };
    }));
  };

  const handleUpdateQuestionText = (id: string, text: string) => {
    setQuestions(prev => prev.map(q => q.tempId === id ? { ...q, questionText: text } : q));
  };

  const handleUpdateOptionText = (qId: string, optId: string, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.tempId !== qId) return q;
      const newOptions = q.options.map(o => o.id === optId ? { ...o, text } : o);
      return { ...q, options: newOptions };
    }));
  };

  const handleSetCorrectOption = (qId: string, correctOptionId: string) => {
    setQuestions(prev => prev.map(q => q.tempId === qId ? { ...q, correctOptionId } : q));
  };

  const handleUpdateExplanation = (qId: string, exp: string) => {
    setQuestions(prev => prev.map(q => q.tempId === qId ? { ...q, explanation: exp } : q));
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.tempId !== id));
  };

  const handleAddEmptyQuestion = () => {
    const newQ: ParsedQuestion = {
      tempId: `custom_${Date.now()}`,
      questionText: 'New Multiple Choice Question',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
        { id: 'C', text: 'Option C' },
        { id: 'D', text: 'Option D' }
      ],
      correctOptionId: 'A',
      explanation: '',
      isValid: true
    };
    setQuestions([...questions, newQ]);
  };

  const handlePublish = () => {
    if (questions.length === 0) {
      alert('Quiz must have at least 1 question before publishing.');
      return;
    }

    const finalQuiz: Quiz = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim() || 'Untitled Quiz',
      description: description.trim(),
      topic: topic.trim() || 'General Knowledge',
      category: category.trim() || 'General',
      difficulty,
      timeLimitMinutes: Math.max(1, timeLimitMinutes),
      passingPercentage: Math.min(100, Math.max(10, passingPercentage)),
      negativeMarks,
      shuffleQuestions,
      shuffleOptions,
      enablePracticeMode,
      quizType,
      scheduledStartDateTime: scheduledStartDateTime || undefined,
      scheduledEndDateTime: scheduledEndDateTime || undefined,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'Admin Importer',

      // Granular Admin Controls
      enableCertificate,
      enableAntiCheating,
      timingMode,
      questionTimeLimitSeconds,
      preventPreviousSectionReturn,
      preventEarlyNextSection,
      preventPreviousQuestionReturn,
      preventEarlyNextQuestion,
      questions: questions.map((q, idx) => ({
        id: `q_${idx + 1}_${Date.now()}`,
        questionText: q.questionText,
        questionEnglish: q.questionEnglish,
        questionHindi: q.questionHindi,
        options: q.options.length >= 2 ? q.options : [
          { id: 'A', text: 'True' },
          { id: 'B', text: 'False' }
        ],
        correctOptionId: q.correctOptionId || 'A',
        explanation: q.explanation,
        explanationEnglish: q.explanationEnglish,
        explanationHindi: q.explanationHindi,
        topic: topic,
        marks: 1
      }))
    };

    onSaveQuiz(finalQuiz);
  };

  const validCount = questions.filter(q => q.questionText && q.options.length >= 2).length;

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Imported from {sourceFileName}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {validCount} of {questions.length} Valid MCQs
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">MCQ Verification & Exam Settings</h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddEmptyQuestion}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add Question</span>
          </button>

          <button
            onClick={handlePublish}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Publish Quiz to Candidate Portal</span>
          </button>
        </div>
      </div>

      {/* Quiz Metadata & Advanced Rules Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span>Quiz Information & Advanced Controls</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Quiz Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
              placeholder="e.g. Library Information Science Topic Test"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Topic Tag (Category)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
              placeholder="e.g. Library Science, Computer Science, Aptitude"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:outline-none"
            placeholder="Brief details about what topics this quiz covers..."
          />
        </div>

        {/* Exam Type Selector: Practice vs Strict Live Contest */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-900">Select Exam Mode & Candidate Access Rule</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQuizType('practice')}
              className={`p-3 rounded-lg border text-left flex items-start space-x-3 transition-all ${
                quizType === 'practice'
                  ? 'bg-white border-blue-600 text-blue-950 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">🌐</span>
              <div>
                <p className="text-xs font-bold">24/7 Practice Exam</p>
                <p className="text-[11px] text-slate-500 font-medium">Permanent live test. Candidates can attempt anytime, unlimited retakes.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setQuizType('live_contest')}
              className={`p-3 rounded-lg border text-left flex items-start space-x-3 transition-all ${
                quizType === 'live_contest'
                  ? 'bg-white border-amber-600 text-amber-950 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">🏆</span>
              <div>
                <p className="text-xs font-bold">Strict Live Contest Exam (Single Attempt)</p>
                <p className="text-[11px] text-slate-500 font-medium">1-Time Lock Exam. Candidates compete on Live Leaderboard and CANNOT retake!</p>
              </div>
            </button>
          </div>

          {quizType === 'live_contest' && (
            <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Contest Official Start Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledStartDateTime}
                  onChange={(e) => setScheduledStartDateTime(e.target.value)}
                  className="w-full p-2 rounded-lg border border-amber-300 bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Candidates CANNOT start test before this exact time.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Contest Official Closing Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledEndDateTime}
                  onChange={(e) => setScheduledEndDateTime(e.target.value)}
                  className="w-full p-2 rounded-lg border border-rose-300 bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Exam portal locks permanently for new submissions after this time.</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Time Limit (Mins)</span>
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 10)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Passing %</span>
            </label>
            <input
              type="number"
              min={10}
              max={100}
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(parseInt(e.target.value) || 60)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Negative Marking</span>
            </label>
            <select
              value={negativeMarks}
              onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value={0}>None (0 Marks)</option>
              <option value={0.25}>-0.25 Marks (25%)</option>
              <option value={0.33}>-0.33 Marks (1/3rd)</option>
              <option value={0.5}>-0.50 Marks (50%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* --- Granular Security & Timing Control Panel --- */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Granular Anti-Cheating & Exam Timing Rules</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Certificate Switch */}
            <label className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300">
              <div>
                <span className="text-xs font-bold text-slate-900 block">📜 Merit Certificate Download</span>
                <span className="text-[11px] text-slate-500 font-medium block">Allow candidate to download PDF Certificate on passing</span>
              </div>
              <input
                type="checkbox"
                checked={enableCertificate}
                onChange={(e) => setEnableCertificate(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {/* Anti Cheating Switch */}
            <label className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300">
              <div>
                <span className="text-xs font-bold text-slate-900 block">⚠️ Tab-Switch Anti-Cheating Warning</span>
                <span className="text-[11px] text-slate-500 font-medium block">Auto-submit exam after 2 tab-switching warnings</span>
              </div>
              <input
                type="checkbox"
                checked={enableAntiCheating}
                onChange={(e) => setEnableAntiCheating(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>

          {/* Timing Mode Radio Selector */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-2">Exam Timing Control Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTimingMode('quiz')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  timingMode === 'quiz' ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                ⏱️ Standard Quiz Time ({timeLimitMinutes} Mins)
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('sectional')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  timingMode === 'sectional' ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                📊 Sectional Timed Mode
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('question')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  timingMode === 'question' ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                ⚡ Question-Wise Timer
              </button>
            </div>
          </div>

          {/* Interactive Sectional Builder */}
          {timingMode === 'sectional' && (
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h5 className="text-xs font-extrabold text-slate-900 flex items-center space-x-1">
                    <span>📊 Sectional Exam Breakdown</span>
                  </h5>
                  <p className="text-[11px] text-slate-500">Configure paper sections, question allocation, and section timers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newSec = {
                      id: `sec_${sections.length + 1}`,
                      sectionName: `Section ${sections.length + 1}: Subject Domain`,
                      questionCount: 5,
                      timeLimitMinutes: 10,
                    };
                    setSections([...sections, newSec]);
                  }}
                  className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold"
                >
                  + Add Section
                </button>
              </div>

              <div className="space-y-3">
                {sections.map((sec) => (
                  <div key={sec.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Section Name</label>
                      <input
                        type="text"
                        value={sec.sectionName}
                        onChange={(e) => {
                          const updated = sections.map(s => s.id === sec.id ? { ...s, sectionName: e.target.value } : s);
                          setSections(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Questions Count</label>
                      <input
                        type="number"
                        min={1}
                        max={questions.length}
                        value={sec.questionCount}
                        onChange={(e) => {
                          const updated = sections.map(s => s.id === sec.id ? { ...s, questionCount: parseInt(e.target.value) || 1 } : s);
                          setSections(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Time Limit (Mins)</label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={sec.timeLimitMinutes}
                        onChange={(e) => {
                          const updated = sections.map(s => s.id === sec.id ? { ...s, timeLimitMinutes: parseInt(e.target.value) || 5 } : s);
                          setSections(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-800">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preventPreviousSectionReturn}
                    onChange={(e) => setPreventPreviousSectionReturn(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Prevent candidate from returning to previous sections</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preventEarlyNextSection}
                    onChange={(e) => setPreventEarlyNextSection(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Prevent candidate from moving to next section until current section time ends</span>
                </label>
              </div>
            </div>
          )}

          {/* Question Controls */}
          {timingMode === 'question' && (
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center space-x-3">
                <label className="font-bold text-slate-800">Time Limit per Question (Seconds):</label>
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={questionTimeLimitSeconds}
                  onChange={(e) => setQuestionTimeLimitSeconds(parseInt(e.target.value) || 60)}
                  className="w-24 p-1.5 rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="flex items-center space-x-2 font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={preventPreviousQuestionReturn}
                    onChange={(e) => setPreventPreviousQuestionReturn(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Prevent candidate from returning to previous questions</span>
                </label>

                <label className="flex items-center space-x-2 font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={preventEarlyNextQuestion}
                    onChange={(e) => setPreventEarlyNextQuestion(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Prevent candidate from advancing until current question timer ends</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Shuffling & Practice Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <div>
              <span className="block text-xs font-bold text-slate-900 flex items-center space-x-1">
                <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Shuffle Questions</span>
              </span>
              <span className="text-[10px] text-slate-500">Randomize question order for each candidate</span>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <div>
              <span className="block text-xs font-bold text-slate-900 flex items-center space-x-1">
                <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Shuffle Options</span>
              </span>
              <span className="text-[10px] text-slate-500">Randomize choice order (A, B, C, D)</span>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={enablePracticeMode}
              onChange={(e) => setEnablePracticeMode(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <div>
              <span className="block text-xs font-bold text-slate-900 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant Practice Mode</span>
              </span>
              <span className="text-[10px] text-slate-500">Show instant answer explanation on selection</span>
            </div>
          </label>
        </div>

      </div>

      {/* Extracted MCQ Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Extracted Questions ({questions.length})</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">Select radio button on option to assign the Correct Answer Key</p>
        </div>

        {questions.map((q, qIndex) => (
          <div
            key={q.tempId}
            className={`p-6 rounded-2xl space-y-4 border bg-white shadow-xs transition-all ${
              q.questionText && q.options.length >= 2
                ? 'border-slate-200'
                : 'border-amber-300 bg-amber-50/20'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xs font-bold font-mono">
                  {qIndex + 1}
                </span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Multiple Choice Question
                </span>
              </div>

              <button
                onClick={() => handleDeleteQuestion(q.tempId || '')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Question Text Field */}
            <div>
              <textarea
                rows={2}
                value={q.questionText}
                onChange={(e) => handleUpdateQuestionText(q.tempId || '', e.target.value)}
                placeholder="Enter Question Text..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Options List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-2.5 rounded-xl border flex items-center space-x-3 transition-all ${
                    q.correctOptionId === opt.id
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <label className="cursor-pointer flex items-center space-x-2 flex-shrink-0">
                    <input
                      type="radio"
                      name={`correct_${q.tempId}`}
                      checked={q.correctOptionId === opt.id}
                      onChange={() => handleSetCorrectOption(q.tempId || '', opt.id)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300"
                    />
                    <span className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center ${
                      q.correctOptionId === opt.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {opt.id}
                    </span>
                  </label>

                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleUpdateOptionText(q.tempId || '', opt.id, e.target.value)}
                    placeholder={`Option ${opt.id} text...`}
                    className="flex-1 bg-transparent text-sm text-slate-900 font-semibold focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleAddOptionToQuestion(q.tempId || '')}
                  className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer"
                >
                  + Add Option ({String.fromCharCode(65 + q.options.length)})
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateDefaultOptions(q.tempId || '')}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  ✨ Auto-Generate (A, B, C, D)
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Click radio button on option (A, B, C, D) to set Correct Answer Key
              </span>
            </div>

            {/* Explanation Field */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Explanation / Answer Rationale (Shown to candidates after test submission)</span>
              </label>
              <textarea
                rows={2}
                value={q.explanation || ''}
                onChange={(e) => handleUpdateExplanation(q.tempId || '', e.target.value)}
                placeholder="Detailed explanation for the correct answer..."
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
        >
          Cancel & Back
        </button>
        <button
          onClick={handlePublish}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Publish Quiz to Candidate Portal</span>
        </button>
      </div>
    </div>
  );
};
