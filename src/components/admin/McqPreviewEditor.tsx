import React, { useMemo, useState } from 'react';
import type { ParsedQuestion, ParseResult, Quiz, DifficultyLevel } from '../../types/quiz';
import { translateToHindi } from '../../utils/translator';
import { getStoredQuizzes } from '../../utils/storage';
import { Mail, Trash2, Plus, ArrowLeft, Save, Sparkles, HelpCircle, Layers, Clock, Award, Shuffle, ShieldAlert, X, Languages, Eye, EyeOff } from 'lucide-react';


interface McqPreviewEditorProps {
  parseResult: ParseResult;
  sourceFileName: string;
  onBack: () => void;
  onSaveQuiz: (quiz: Quiz) => void;
  registeredEmails?: string[];
}

export const McqPreviewEditor: React.FC<McqPreviewEditorProps> = ({
  parseResult,
  sourceFileName,
  onBack,
  onSaveQuiz,
  registeredEmails = [],
}) => {
  const [title, setTitle] = useState(parseResult.title || sourceFileName.replace(/\.[^/.]+$/, ''));
  const [topic, setTopic] = useState(parseResult.topic || 'General Knowledge');
  const existingTopics = useMemo(
    () =>
      Array.from(
        new Set(
          getStoredQuizzes()
            .map((q) => (q.topic || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    []
  );
  const [category] = useState('General');
  const [description, setDescription] = useState(parseResult.description || `Comprehensive assessment covering ${parseResult.questions.length} MCQs.`);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(parseResult.difficulty || 'Medium');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(parseResult.timeLimitMinutes ?? 15);
  const [passingPercentage, setPassingPercentage] = useState(parseResult.passingPercentage ?? 60);
  const [negativeMarks, setNegativeMarks] = useState<number>(parseResult.negativeMarks ?? 0.25);
  const [shuffleQuestions, setShuffleQuestions] = useState(parseResult.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(parseResult.shuffleOptions ?? false);
  const [enablePracticeMode, setEnablePracticeMode] = useState(parseResult.enablePracticeMode ?? false);
  const [quizType, setQuizType] = useState<'practice' | 'live_contest'>(parseResult.quizType || 'practice');
  const [scheduledStartDateTime, setScheduledStartDateTime] = useState<string>(parseResult.scheduledStartDateTime || '');
  const [scheduledEndDateTime, setScheduledEndDateTime] = useState<string>(parseResult.scheduledEndDateTime || '');
  const [defaultLanguageMode, setDefaultLanguageMode] = useState<'en' | 'hi' | 'dual'>(parseResult.defaultLanguageMode || 'en');
  const [isPublished, setIsPublished] = useState<boolean>(parseResult.isPublished ?? true);

  // --- Privacy & Access Controls ---
  const [accessCode, setAccessCode] = useState<string>(parseResult.accessCode || '');
  const [allowedEmails, setAllowedEmails] = useState<string[]>(
    parseResult.allowedEmails || []
  );
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // --- Granular Admin Settings & Rules ---
  const [enableCertificate, setEnableCertificate] = useState(typeof parseResult.enableCertificate === 'boolean' ? parseResult.enableCertificate : true);
  const [enableAntiCheating, setEnableAntiCheating] = useState(parseResult.enableAntiCheating ?? false);
  const [maxAttempts, setMaxAttempts] = useState<number>(parseResult.maxAttempts ?? 0);
  const [maxTabSwitches, setMaxTabSwitches] = useState<number>(parseResult.maxTabSwitches ?? 3);
  const [resultAnnouncementDateTime, setResultAnnouncementDateTime] = useState<string>(parseResult.resultAnnouncementDateTime || '');
  const [autoEmailResults, setAutoEmailResults] = useState<boolean>(parseResult.autoEmailResults ?? true);
  const [timingMode, setTimingMode] = useState<'quiz' | 'sectional' | 'question'>(parseResult.timingMode || 'quiz');
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState(parseResult.questionTimeLimitSeconds ?? 60);
  const [preventPreviousSectionReturn, setPreventPreviousSectionReturn] = useState(parseResult.preventPreviousSectionReturn ?? false);
  const [preventEarlyNextSection, setPreventEarlyNextSection] = useState(parseResult.preventEarlyNextSection ?? false);
  const [preventPreviousQuestionReturn, setPreventPreviousQuestionReturn] = useState(parseResult.preventPreviousQuestionReturn ?? false);
  const [preventEarlyNextQuestion, setPreventEarlyNextQuestion] = useState(parseResult.preventEarlyNextQuestion ?? false);
  const [questionViewMode, setQuestionViewMode] = useState<'both' | 'single_only' | 'all_only'>(parseResult.questionViewMode || 'both');
  const [allowManualEarlyMove, setAllowManualEarlyMove] = useState(parseResult.allowManualEarlyMove ?? false);
  const [notifyCandidates, setNotifyCandidates] = useState<boolean>(false);


  // Section type with both auto-range and manual question pick support
  type SectionDef = {
    id: string;
    sectionName: string;
    questionCount: number;
    timeLimitMinutes: number;
    assignmentMode: 'auto' | 'manual';
    manualQuestionIds: string[];
    expanded: boolean;
  };

  const buildDefaultSections = (qList: typeof parseResult.questions, totalMins: number): SectionDef[] => {
    const half = Math.ceil(qList.length / 2);
    const half2 = qList.length - half;
    const mins1 = Math.round((half / qList.length) * totalMins) || 1;
    const mins2 = Math.max(1, totalMins - mins1);
    return [
      { id: 'sec_1', sectionName: 'Section 1: General Aptitude', questionCount: half, timeLimitMinutes: mins1, assignmentMode: 'auto', manualQuestionIds: [], expanded: false },
      { id: 'sec_2', sectionName: 'Section 2: Technical Domain', questionCount: half2, timeLimitMinutes: mins2, assignmentMode: 'auto', manualQuestionIds: [], expanded: false },
    ];
  };

  const [sections, setSections] = useState<SectionDef[]>(
    parseResult.sectionalConfig
      ? parseResult.sectionalConfig.map((s: any) => ({
        ...s,
        assignmentMode: s.assignmentMode || 'auto',
        manualQuestionIds: s.questionIds || [],
        expanded: false,
      }))
      : buildDefaultSections(parseResult.questions, parseResult.timeLimitMinutes ?? 15)
  );

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

  const handleDeleteOptionFromQuestion = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.tempId !== qId) return q;
      if (q.options.length <= 2) return q; // Minimum 2 options required
      const filtered = q.options.filter(o => o.id !== optId);
      const reindexed = filtered.map((o, idx) => ({
        ...o,
        id: String.fromCharCode(65 + idx),
      }));
      return {
        ...q,
        options: reindexed,
        correctOptionId: reindexed.some(o => o.id === q.correctOptionId) ? q.correctOptionId : reindexed[0].id,
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
    setQuestions(prev => prev.map(q => q.tempId === id ? {
      ...q,
      questionText: text,
      questionEnglish: text,
    } : q));
  };

  const handleUpdateQuestionHindi = (id: string, hindiText: string) => {
    setQuestions(prev => prev.map(q => q.tempId === id ? { ...q, questionHindi: hindiText } : q));
  };

  const handleAutoTranslateQuestion = async (id: string) => {
    const targetQ = questions.find(q => q.tempId === id);
    if (!targetQ) return;
    const srcText = targetQ.questionText || targetQ.questionEnglish;
    if (!srcText) return;
    try {
      const translated = await translateToHindi(srcText);
      if (translated) {
        setQuestions(prev => prev.map(q => q.tempId === id ? { ...q, questionHindi: translated } : q));
      }
    } catch { }
  };

  const handleUpdateOptionText = (qId: string, optId: string, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.tempId !== qId) return q;
      const newOptions = q.options.map(o => o.id === optId ? { ...o, text } : o);
      return { ...q, options: newOptions };
    }));
  };

  const handleSetCorrectOption = (qId: string, correctOptionId: string) => {
    setQuestions(prev => prev.map(q => q.tempId === qId ? { ...q, correctOptionId, correctOptionIds: [correctOptionId] } : q));
  };

  const handleToggleCorrectOptionMultiple = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.tempId !== qId) return q;
      const currentIds = q.correctOptionIds || [q.correctOptionId || 'A'];
      let updatedIds: string[];
      if (currentIds.includes(optId)) {
        updatedIds = currentIds.filter(id => id !== optId);
        if (updatedIds.length === 0) updatedIds = [optId];
      } else {
        updatedIds = [...currentIds, optId].sort();
      }
      return {
        ...q,
        correctOptionIds: updatedIds,
        correctOptionId: updatedIds.join(', '),
      };
    }));
  };

  const handleUpdateExplanation = (qId: string, exp: string) => {
    setQuestions(prev => prev.map(q => q.tempId === qId ? { ...q, explanation: exp } : q));
  };

  const handleImageFileUpload = (qId: string, file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setQuestions(prev => prev.map(item => item.tempId === qId ? { ...item, imageUrl: dataUrl } : item));
    };
    reader.readAsDataURL(file);
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

  const handlePublish = (targetPublished: boolean = isPublished) => {
    if (questions.length === 0) {
      alert('Quiz must have at least 1 question before saving.');
      return;
    }

    const finalQuiz: Quiz = {
      id: parseResult.existingQuizId || `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
      defaultLanguageMode,
      isPublished: targetPublished,
      createdAt: parseResult.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'Admin Importer',

      accessCode: accessCode.trim() || undefined,
      allowedEmails: allowedEmails.length > 0 ? allowedEmails : undefined,

      // Granular Admin Controls
      enableCertificate,
      enableAntiCheating,
      maxAttempts,
      maxTabSwitches,
      resultAnnouncementDateTime: resultAnnouncementDateTime || undefined,
      autoEmailResults,
      timingMode,
      questionTimeLimitSeconds,
      preventPreviousSectionReturn,
      preventEarlyNextSection,
      preventPreviousQuestionReturn,
      preventEarlyNextQuestion,
      questionViewMode,
      allowManualEarlyMove,
      notifyCandidates,
      sectionalConfig: (() => {
        // Build sequential auto-ranges for 'auto' sections; use manual picks for 'manual' sections
        let cursor = 0;
        return sections.map(sec => {
          let qIds: string[];
          if (sec.assignmentMode === 'manual') {
            qIds = sec.manualQuestionIds;
          } else {
            qIds = questions.slice(cursor, cursor + sec.questionCount).map((q, i) => q.tempId || `q_${cursor + i + 1}`);
          }
          cursor += sec.questionCount;
          return {
            id: sec.id,
            sectionName: sec.sectionName,
            questionIds: qIds,
            questionCount: sec.questionCount,
            timeLimitMinutes: sec.timeLimitMinutes,
          };
        });
      })(),
      questions: questions.map((q, idx) => ({
        id: q.tempId || `q_${idx + 1}_${Date.now()}`,
        questionText: q.questionText,
        questionEnglish: q.questionEnglish,
        questionHindi: q.questionHindi,
        options: (q.options && q.options.length >= 2) ? q.options : [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
          { id: 'C', text: 'Option C' },
          { id: 'D', text: 'Option D' }
        ],
        correctOptionId: q.correctOptionId || 'A',
        correctOptionIds: q.correctOptionIds,
        questionType: q.questionType || 'mcq',
        imageUrl: q.imageUrl,
        listI: q.listI,
        listII: q.listII,
        explanation: q.explanation,
        explanationEnglish: q.explanationEnglish,
        explanationHindi: q.explanationHindi,
        topic: topic,
        marks: q.marks || 1
      }))
    };

    onSaveQuiz(finalQuiz);
  };

  const validCount = questions.filter(q => q.questionText && q.options.length >= 2).length;

  // Whitelist Tag Input Helper Actions
  const handleEmailInputChange = (val: string) => {
    setEmailInput(val);
    if (!val.trim()) {
      setEmailSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const typed = val.toLowerCase().trim();
    if (registeredEmails) {
      const matches = registeredEmails.filter(
        (email) => email.toLowerCase().includes(typed) && !allowedEmails.includes(email)
      );
      setEmailSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    }
  };

  const addEmailTag = (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(cleanEmail) && !allowedEmails.includes(cleanEmail)) {
      setAllowedEmails([...allowedEmails, cleanEmail]);
      setEmailInput('');
      setEmailSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const removeEmailTag = (emailToRemove: string) => {
    setAllowedEmails(allowedEmails.filter((email) => email !== emailToRemove));
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmailTag(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && allowedEmails.length > 0) {
      removeEmailTag(allowedEmails[allowedEmails.length - 1]);
    }
  };

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
            type="button"
            onClick={() => handlePublish(false)}
            className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            title="Save as Draft: hidden from students in candidate catalog"
          >
            <EyeOff className="w-4 h-4 text-amber-600" />
            <span>Save as Draft (Unpublished)</span>
          </button>

          <button
            type="button"
            onClick={() => handlePublish(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Publish: make live immediately in student catalog"
          >
            <Eye className="w-4 h-4" />
            <span>Publish to Portal (Live)</span>
          </button>
        </div>
      </div>

      {/* Quiz Metadata & Advanced Rules Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span>Quiz Information & Advanced Controls</span>
        </h3>

        {/* Publication Status Control */}
        <div className="flex flex-wrap items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-bold text-slate-700">Exam Visibility:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isPublished 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              {isPublished ? 'Published (Live for Students)' : 'Draft (Hidden from Students)'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsPublished(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                isPublished
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Published</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPublished(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                !isPublished
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Draft (Unpublished)</span>
            </button>
          </div>
        </div>

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
            <label className="block text-xs font-bold text-slate-700 mb-1">Topic Tag (Category / Subject)</label>
            <input
              type="text"
              list="evalnium-existing-topics"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
              placeholder="e.g. Library and Information Science, Classification, Cataloguing"
            />
            <datalist id="evalnium-existing-topics">
              {existingTopics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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
              className={`p-3 rounded-lg border text-left flex items-start space-x-3 transition-all ${quizType === 'practice'
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
              className={`p-3 rounded-lg border text-left flex items-start space-x-3 transition-all ${quizType === 'live_contest'
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
              onChange={(e) => {
                const newMins = parseInt(e.target.value) || 10;
                setTimeLimitMinutes(newMins);
                if (timingMode === 'question' && questions.length > 0) {
                  setQuestionTimeLimitSeconds(Math.round((newMins * 60) / questions.length));
                }
              }}
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
                <span className="text-[11px] text-slate-500 font-medium block">Auto-submit exam after tab-switching violations</span>
              </div>
              <input
                type="checkbox"
                checked={enableAntiCheating}
                onChange={(e) => setEnableAntiCheating(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {/* Outgoing Candidate Email Notification Switch */}
            <label className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors">
              <div>
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  📢 Notify Candidates via Email
                </span>
                <span className="text-[11px] text-blue-700/80 font-medium block">
                  Automatically dispatch "New Assessment Available" email alerts to all verified students upon publishing
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyCandidates}
                onChange={(e) => setNotifyCandidates(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>


            {/* Max Tab Switches */}
            {enableAntiCheating && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">🚨 Violations Before Auto-Submit</span>
                  <span className="text-[11px] text-slate-500 font-medium block">Also triggers on window blur (Alt+Tab) and significant resize (split-screen)</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[1, 2, 3, 5].map(n => (
                    <button key={n} type="button" onClick={() => setMaxTabSwitches(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${maxTabSwitches === n ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}>
                      {n} Violation{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Max Attempts Control */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 md:col-span-2 space-y-2">
              <div>
                <span className="text-xs font-bold text-slate-900 block">🔁 Retake / Attempt Limit</span>
                <span className="text-[11px] text-slate-500 font-medium block">Control how many times a candidate can attempt this exam</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[{ label: 'Unlimited', value: 0 }, { label: '1 Attempt', value: 1 }, { label: '2 Attempts', value: 2 }, { label: '3 Attempts', value: 3 }].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMaxAttempts(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${maxAttempts === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Announcement Date/Time */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
            <div>
              <span className="text-xs font-bold text-slate-900 block">📅 Result Announcement Date &amp; Time</span>
              <span className="text-[11px] text-slate-500 font-medium block">Leave blank for instant results. Set a future date to hide scores &amp; leaderboard until announced.</span>
            </div>
            <input
              type="datetime-local"
              value={resultAnnouncementDateTime}
              onChange={(e) => setResultAnnouncementDateTime(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
            {resultAnnouncementDateTime && (
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoEmailResults}
                    onChange={(e) => setAutoEmailResults(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Auto-email official scorecard &amp; marks to candidates when announcement time arrives</span>
                </label>
                <div>
                  <button type="button" onClick={() => setResultAnnouncementDateTime('')}
                    className="text-[11px] text-rose-600 hover:underline font-semibold">
                    Clear (revert to instant results)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timing Mode Radio Selector */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-2">Exam Timing Control Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTimingMode('quiz')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${timingMode === 'quiz' ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                  }`}
              >
                ⏱️ Standard Quiz Time ({timeLimitMinutes} Mins)
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('sectional')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${timingMode === 'sectional' ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                  }`}
              >
                📊 Sectional Timed Mode
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('question')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${timingMode === 'question' ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                  }`}
              >
                ⚡ Question-Wise Timer
              </button>
            </div>
          </div>

          {/* Question Display Layout Control */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Question Screen Display Layout Controls (Exam Interface Mode)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setQuestionViewMode('both')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${questionViewMode === 'both' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                  }`}
              >
                🔄 Both Options Allowed (Candidate Choice)
              </button>

              <button
                type="button"
                onClick={() => setQuestionViewMode('single_only')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${questionViewMode === 'single_only' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                  }`}
              >
                📄 Force 1 Question / Screen Only
              </button>

              <button
                type="button"
                onClick={() => setQuestionViewMode('all_only')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${questionViewMode === 'all_only' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                  }`}
              >
                📜 Force All Questions On 1 Screen
              </button>
            </div>
          </div>

          {/* Interactive Sectional Builder — Redesigned */}
          {timingMode === 'sectional' && (() => {
            const totalAssigned = sections.reduce((s, sec) => s + (sec.assignmentMode === 'manual' ? sec.manualQuestionIds.length : sec.questionCount), 0);
            const totalTime = sections.reduce((s, sec) => s + sec.timeLimitMinutes, 0);
            const isOverAssigned = totalAssigned > questions.length;
            const isUnderAssigned = totalAssigned < questions.length;

            const redistributeQuestions = (newSections: typeof sections) => {
              const n = newSections.length;
              if (n === 0) return newSections;
              const base = Math.floor(questions.length / n);
              const remainder = questions.length % n;
              const totalMins = timeLimitMinutes;
              return newSections.map((sec, i) => {
                const qCount = base + (i < remainder ? 1 : 0);
                const minsForSec = Math.max(1, Math.round((qCount / questions.length) * totalMins));
                return { ...sec, questionCount: qCount, timeLimitMinutes: minsForSec };
              });
            };

            return (
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 flex items-center space-x-1">
                      <span>📊 Sectional Exam Breakdown</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Each section gets its own timer. Questions are assigned sequentially (auto) or hand-picked (manual).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newSec: typeof sections[0] = {
                        id: `sec_${Date.now()}`,
                        sectionName: `Section ${sections.length + 1}: New Subject`,
                        questionCount: 0,
                        timeLimitMinutes: 0,
                        assignmentMode: 'auto',
                        manualQuestionIds: [],
                        expanded: false,
                      };
                      const updated = redistributeQuestions([...sections, newSec]);
                      setSections(updated);
                      // Sync total time
                      const newTotal = updated.reduce((s, sec) => s + sec.timeLimitMinutes, 0);
                      setTimeLimitMinutes(Math.max(1, newTotal));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold flex items-center space-x-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>

                {/* Validation Bar */}
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold ${isOverAssigned ? 'bg-rose-50 border border-rose-300 text-rose-700'
                  : isUnderAssigned ? 'bg-amber-50 border border-amber-300 text-amber-700'
                    : 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                  }`}>
                  <span>
                    {isOverAssigned ? '⚠️' : isUnderAssigned ? '⚡' : '✅'}
                    &nbsp;Questions assigned: <span className="font-mono">{totalAssigned}</span> / <span className="font-mono">{questions.length}</span>
                    {isOverAssigned && ' — Over-assigned! Reduce question counts.'}
                    {isUnderAssigned && ` — ${questions.length - totalAssigned} questions unassigned`}
                    {!isOverAssigned && !isUnderAssigned && ' — All questions assigned perfectly!'}
                  </span>
                  <span className="text-slate-500 font-medium">Total time: <span className="font-mono font-bold text-slate-800">{totalTime} mins</span></span>
                </div>

                {/* Section Rows */}
                <div className="space-y-3">
                  {sections.map((sec, secIdx) => {
                    // Calculate auto-range start index for display
                    let rangeStart = 1;
                    for (let i = 0; i < secIdx; i++) {
                      rangeStart += sections[i].assignmentMode === 'manual'
                        ? sections[i].manualQuestionIds.length
                        : sections[i].questionCount;
                    }
                    const rangeEnd = rangeStart + (sec.assignmentMode === 'auto' ? sec.questionCount : sec.manualQuestionIds.length) - 1;

                    return (
                      <div key={sec.id} className="rounded-xl border border-slate-200 overflow-hidden">
                        {/* Section Card Top Row */}
                        <div className="p-3 bg-slate-50 grid grid-cols-12 gap-2 items-end">
                          {/* Section Name */}
                          <div className="col-span-12 sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Section Name</label>
                            <input
                              type="text"
                              value={sec.sectionName}
                              onChange={(e) => {
                                setSections(sections.map(s => s.id === sec.id ? { ...s, sectionName: e.target.value } : s));
                              }}
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-indigo-400"
                            />
                          </div>

                          {/* Questions Count (auto mode only) */}
                          <div className="col-span-5 sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              {sec.assignmentMode === 'auto' ? 'Questions Count' : 'Selected Qs'}
                            </label>
                            {sec.assignmentMode === 'auto' ? (
                              <input
                                type="number"
                                min={1}
                                max={questions.length}
                                value={sec.questionCount}
                                onChange={(e) => {
                                  const newCount = parseInt(e.target.value) || 1;
                                  const updatedSections = sections.map(s => s.id === sec.id ? { ...s, questionCount: newCount } : s);
                                  const newTotal = updatedSections.reduce((sum, s) => sum + s.timeLimitMinutes, 0);
                                  setSections(updatedSections);
                                  setTimeLimitMinutes(Math.max(1, newTotal));
                                }}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white font-mono focus:outline-none focus:border-indigo-400"
                              />
                            ) : (
                              <div className="p-2 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-indigo-700">
                                {sec.manualQuestionIds.length} picked
                              </div>
                            )}
                          </div>

                          {/* Time Limit */}
                          <div className="col-span-5 sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Time (Mins)</label>
                            <input
                              type="number"
                              min={1}
                              max={300}
                              value={sec.timeLimitMinutes}
                              onChange={(e) => {
                                const newMins = parseInt(e.target.value) || 1;
                                const updatedSections = sections.map(s => s.id === sec.id ? { ...s, timeLimitMinutes: newMins } : s);
                                setSections(updatedSections);
                                // Sync total time limit
                                const newTotal = updatedSections.reduce((sum, s) => sum + s.timeLimitMinutes, 0);
                                setTimeLimitMinutes(Math.max(1, newTotal));
                              }}
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white font-mono focus:outline-none focus:border-indigo-400"
                            />
                          </div>

                          {/* Auto/Manual toggle + Expand + Delete */}
                          <div className="col-span-12 sm:col-span-4 flex items-center justify-end space-x-1.5">
                            {/* Auto range badge */}
                            {sec.assignmentMode === 'auto' && sec.questionCount > 0 && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                                Q{rangeStart}–Q{Math.min(rangeEnd, questions.length)}
                              </span>
                            )}
                            <button
                              type="button"
                              title={sec.assignmentMode === 'auto' ? 'Switch to Manual Question Pick' : 'Switch to Auto Range'}
                              onClick={() => {
                                setSections(sections.map(s => s.id === sec.id
                                  ? { ...s, assignmentMode: s.assignmentMode === 'auto' ? 'manual' : 'auto', expanded: s.assignmentMode === 'auto' ? true : false }
                                  : s
                                ));
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${sec.assignmentMode === 'manual'
                                ? 'bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                              {sec.assignmentMode === 'auto' ? '🎯 Manual Pick' : '⚡ Auto Range'}
                            </button>
                            <button
                              type="button"
                              title="Expand / Collapse"
                              onClick={() => {
                                setSections(sections.map(s => s.id === sec.id ? { ...s, expanded: !s.expanded } : s));
                              }}
                              className="p-1.5 rounded-md bg-white border border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 transition-all text-[10px] font-bold"
                            >
                              {sec.expanded ? '▲' : '▼'}
                            </button>
                            <button
                              type="button"
                              title="Delete Section"
                              disabled={sections.length <= 1}
                              onClick={() => {
                                const remaining = sections.filter(s => s.id !== sec.id);
                                const updated = redistributeQuestions(remaining);
                                setSections(updated);
                                const newTotal = updated.reduce((sum, s) => sum + s.timeLimitMinutes, 0);
                                setTimeLimitMinutes(Math.max(1, newTotal));
                              }}
                              className="p-1.5 rounded-md bg-white border border-rose-200 text-rose-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Manual Picker */}
                        {sec.expanded && sec.assignmentMode === 'manual' && (
                          <div className="p-3 bg-white border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 mb-2">Click questions to add/remove from this section:</p>
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                              {questions.map((q, qIdx) => {
                                const qId = q.tempId || `q_${qIdx}`;
                                const isSelected = sec.manualQuestionIds.includes(qId);
                                // Check if this question is used in another section
                                const usedInOther = sections.some(s => s.id !== sec.id && s.assignmentMode === 'manual' && s.manualQuestionIds.includes(qId));
                                return (
                                  <button
                                    key={qId}
                                    type="button"
                                    disabled={usedInOther}
                                    title={usedInOther ? 'Already used in another section' : `Q${qIdx + 1}: ${q.questionText?.slice(0, 60)}...`}
                                    onClick={() => {
                                      const newIds = isSelected
                                        ? sec.manualQuestionIds.filter(id => id !== qId)
                                        : [...sec.manualQuestionIds, qId];
                                      setSections(sections.map(s => s.id === sec.id ? { ...s, manualQuestionIds: newIds } : s));
                                    }}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${usedInOther
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                      : isSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                        : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-700'
                                      }`}
                                  >
                                    Q{qIdx + 1}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">{sec.manualQuestionIds.length} question{sec.manualQuestionIds.length !== 1 ? 's' : ''} selected for this section.</p>
                          </div>
                        )}

                        {/* Expanded Auto Range Info */}
                        {sec.expanded && sec.assignmentMode === 'auto' && (
                          <div className="p-3 bg-white border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 mb-2">Auto-assigned questions (sequential range):</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                const startIdx = rangeStart - 1;
                                return questions.slice(startIdx, startIdx + sec.questionCount).map((q, i) => (
                                  <span key={q.tempId || i} className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                                    Q{startIdx + i + 1}
                                  </span>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Redistribute & Reset Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = redistributeQuestions(sections);
                      setSections(updated);
                      const newTotal = updated.reduce((sum, s) => sum + s.timeLimitMinutes, 0);
                      setTimeLimitMinutes(Math.max(1, newTotal));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 text-xs font-bold flex items-center space-x-1"
                  >
                    <span>⚖️ Auto-Redistribute Questions Evenly</span>
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">Main timer syncs automatically</span>
                </div>

                {/* Checkboxes */}
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
                  {preventEarlyNextSection && (
                    <label className="flex items-center space-x-2 ml-5 text-violet-800">
                      <input
                        type="checkbox"
                        checked={allowManualEarlyMove}
                        onChange={(e) => setAllowManualEarlyMove(e.target.checked)}
                        className="rounded text-violet-600"
                      />
                      <span>↳ Allow candidate to manually finish section early &amp; move to next (but cannot go back)</span>
                    </label>
                  )}
                </div>
              </div>
            );
          })()}

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
                  onChange={(e) => {
                    const newSecs = parseInt(e.target.value) || 60;
                    setQuestionTimeLimitSeconds(newSecs);
                    if (questions.length > 0) {
                      setTimeLimitMinutes(Math.round((newSecs * questions.length) / 60));
                    }
                  }}
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

        {/* Default Language Selector */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 flex items-center space-x-2">
            <span>🌐 Default Exam Starting Language Mode for Candidates:</span>
          </label>
          <select
            value={defaultLanguageMode}
            onChange={(e) => setDefaultLanguageMode(e.target.value as any)}
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="en">🇬🇧 English Only (Default)</option>
            <option value="hi">🇮🇳 Hindi Only (हिन्दी)</option>
            <option value="dual">🌐 Dual Mode (English + Hindi)</option>
          </select>
        </div>

      </div>

      {/* Privacy & Access Controls */}
      <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 shadow-xs space-y-6">
        <h3 className="text-sm font-black text-rose-900 flex items-center space-x-2 border-b border-rose-200 pb-3">
          <span>🔒 Privacy & Access Control (Targeted Exams)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex flex-col">
              <span>🔑 Exam Passcode (Optional)</span>
              <span className="text-[10px] font-normal text-slate-500">Require candidates to enter this code to start.</span>
            </label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="e.g. BATCH-A-123"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-400 bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex flex-col">
              <span>🎯 Allowed Emails Whitelist (Optional)</span>
              <span className="text-[10px] font-normal text-slate-500">Add candidates allowed to attempt. Leave empty for public.</span>
            </label>

            {/* Tag Container */}
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-xl bg-white focus-within:border-rose-400 min-h-[42px] items-center relative transition-all">
              {allowedEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 animate-in zoom-in-95 duration-150"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeEmailTag(email)}
                    className="text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={emailInput}
                onChange={(e) => handleEmailInputChange(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                placeholder={allowedEmails.length === 0 ? "type email and press Enter..." : ""}
                className="flex-1 min-w-[150px] border-none outline-none text-sm font-semibold text-slate-900 bg-transparent p-1 focus:ring-0"
              />

              {/* Floating Dropdown Autocomplete */}
              {showSuggestions && emailSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-50 p-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">Registered Candidates</p>
                  {emailSuggestions.map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => addEmailTag(email)}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:text-white hover:bg-indigo-600 rounded-xl transition-all cursor-pointer"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Extracted MCQ Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Extracted Questions ({questions.length})</span>
          </h3>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Set Marks for ALL Questions:</span>
              <input
                type="number"
                min="1"
                placeholder="Ex: 2"
                className="w-16 p-1 rounded-lg border border-emerald-300 text-xs font-bold text-center focus:outline-none bg-white"
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0) {
                    setQuestions(prev => prev.map(q => ({ ...q, marks: val })));
                    e.target.value = ''; // clear after apply
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">Select radio button on option to assign the Correct Answer Key</p>
          </div>
        </div>

        {questions.map((q, qIndex) => (
          <div
            key={q.tempId}
            className={`p-6 rounded-2xl space-y-4 border bg-white shadow-xs transition-all ${q.questionText && q.options.length >= 2
              ? 'border-slate-200'
              : 'border-amber-300 bg-amber-50/20'
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xs font-bold font-mono">
                  {qIndex + 1}
                </span>

                {/* Question Type Selector */}
                <select
                  value={q.questionType || 'mcq'}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setQuestions(prev => prev.map(item => item.tempId === q.tempId ? { ...item, questionType: newType } : item));
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="mcq">🔘 Single Choice MCQ</option>
                  <option value="multiple_select">☑️ Multiple Select (MSQ)</option>
                  <option value="match_following">🧩 Match the Following</option>
                </select>

                {/* Marks Selector */}
                <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase">Marks:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={q.marks || 1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuestions(prev => prev.map(item => item.tempId === q.tempId ? { ...item, marks: val } : item));
                    }}
                    className="w-12 p-0.5 rounded bg-white border border-emerald-300 text-xs font-bold text-center text-emerald-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={() => handleDeleteQuestion(q.tempId || '')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Question Text Field & Image Attachment URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Question Text (English / Primary):</span>
                <button
                  type="button"
                  onClick={() => handleAutoTranslateQuestion(q.tempId || '')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs"
                  title="Automatically generate Hindi translation"
                >
                  <Languages className="w-3.5 h-3.5 text-amber-600" />
                  <span>Translate to Hindi ✨</span>
                </button>
              </div>

              <textarea
                rows={2}
                value={q.questionText}
                onChange={(e) => handleUpdateQuestionText(q.tempId || '', e.target.value)}
                placeholder="Enter Question Text..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
              />

              {/* Hindi Question Field */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-800 flex items-center space-x-1">
                  <Languages className="w-3 h-3 text-amber-600" />
                  <span>हिन्दी प्रश्न (Hindi Question Text - Optional / Auto):</span>
                </span>
                <textarea
                  rows={2}
                  value={q.questionHindi || ''}
                  onChange={(e) => handleUpdateQuestionHindi(q.tempId || '', e.target.value)}
                  placeholder="हिन्दी प्रश्न यहाँ दर्ज करें (या 'Translate to Hindi ✨' पर क्लिक करें)..."
                  className="w-full p-2.5 rounded-xl bg-amber-50/40 border border-amber-200 text-slate-800 font-medium text-xs focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1 flex-shrink-0">
                  <span>📷 Diagram / Image:</span>
                </span>

                <input
                  type="text"
                  value={q.imageUrl || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions(prev => prev.map(item => item.tempId === q.tempId ? { ...item, imageUrl: val } : item));
                  }}
                  placeholder="Paste Image URL (https://...) OR click Upload File..."
                  className="flex-1 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:border-indigo-500"
                />

                <label className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 flex-shrink-0 justify-center">
                  <span>📁 Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFileUpload(q.tempId || '', file);
                    }}
                  />
                </label>

                {q.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions(prev => prev.map(item => item.tempId === q.tempId ? { ...item, imageUrl: '' } : item));
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                  >
                    ❌ Remove Image
                  </button>
                )}
              </div>

              {/* Image Preview Box if imageUrl present */}
              {q.imageUrl && (
                <div className="mt-2 p-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center space-x-3">
                  <img src={q.imageUrl} alt="Uploaded Diagram" className="w-16 h-16 object-contain rounded-lg bg-white border border-slate-200 flex-shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Image Attached Successfully!</span>
                    <span className="text-slate-500 font-mono text-[10px]">Will be displayed to candidates during live exam.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Match the Following List I & List II Builder */}
            {q.questionType === 'match_following' && (
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                <h5 className="text-xs font-extrabold text-indigo-950 flex items-center space-x-1">
                  <span>🧩 Match the Following List Columns</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  <div className="space-y-1.5">
                    <span className="text-indigo-900 block">List I (Items 1, 2, 3, 4):</span>
                    {[0, 1, 2, 3].map(i => (
                      <input
                        key={i}
                        type="text"
                        value={q.listI?.[i] || ''}
                        onChange={(e) => {
                          const newListI = [...(q.listI || ['', '', '', ''])];
                          newListI[i] = e.target.value;
                          setQuestions(prev => prev.map(item => item.tempId === q.tempId ? { ...item, listI: newListI } : item));
                        }}
                        placeholder={`1. Item ${i + 1}...`}
                        className="w-full p-2 rounded-lg bg-white border border-indigo-200 text-xs font-medium"
                      />
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-indigo-900 block">List II (Items A, B, C, D):</span>
                    {[0, 1, 2, 3].map(i => (
                      <input
                        key={i}
                        type="text"
                        value={q.listII?.[i] || ''}
                        onChange={(e) => {
                          const newListII = [...(q.listII || ['', '', '', ''])];
                          newListII[i] = e.target.value;
                          setQuestions(prev => prev.map(item => item.tempId === q.tempId ? { ...item, listII: newListII } : item));
                        }}
                        placeholder={`${String.fromCharCode(65 + i)}. Item ${String.fromCharCode(65 + i)}...`}
                        className="w-full p-2 rounded-lg bg-white border border-indigo-200 text-xs font-medium"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {q.options.map((opt) => {
                const isMSQ = q.questionType === 'multiple_select';
                const isCorrect = isMSQ
                  ? (q.correctOptionIds || [q.correctOptionId]).includes(opt.id)
                  : q.correctOptionId === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`p-2.5 rounded-xl border flex items-center space-x-3 transition-all ${isCorrect
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                  >
                    <label className="cursor-pointer flex items-center space-x-2 flex-shrink-0">
                      <input
                        type={isMSQ ? "checkbox" : "radio"}
                        name={`correct_${q.tempId}`}
                        checked={isCorrect}
                        onChange={() => {
                          if (isMSQ) {
                            handleToggleCorrectOptionMultiple(q.tempId || '', opt.id);
                          } else {
                            handleSetCorrectOption(q.tempId || '', opt.id);
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300 rounded"
                      />
                      <span className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
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

                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOptionFromQuestion(q.tempId || '', opt.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Delete this option"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
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
          type="button"
          onClick={() => handlePublish(false)}
          className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          title="Save as Draft: hidden from students in candidate catalog"
        >
          <EyeOff className="w-4 h-4 text-amber-600" />
          <span>Save as Draft (Unpublished)</span>
        </button>

        <button
          type="button"
          onClick={() => handlePublish(true)}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all cursor-pointer"
          title="Publish: make live immediately in student catalog"
        >
          <Eye className="w-4 h-4" />
          <span>Publish to Portal (Live)</span>
        </button>
      </div>
    </div>
  );
};
