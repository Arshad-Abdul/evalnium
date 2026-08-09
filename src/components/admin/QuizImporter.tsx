import React, { useState, useRef } from 'react';
import { Upload, FileText, FileSpreadsheet, FileCode, AlertTriangle, Sparkles, File, ArrowRight, Download, Copy, HelpCircle, X } from 'lucide-react';
import { parseCSV, parseMarkdown, parseDOCX, parsePlainText } from '../../utils/parsers';
import type { ParseResult } from '../../types/quiz';

interface QuizImporterProps {
  onParsedResult: (result: ParseResult, sourceName: string) => void;
}

export const QuizImporter: React.FC<QuizImporterProps> = ({ onParsedResult }) => {
  const [activeInputType, setActiveInputType] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let parseRes: ParseResult;

      if (extension === 'csv') {
        const text = await file.text();
        parseRes = parseCSV(text);
      } else if (extension === 'md' || extension === 'markdown') {
        const text = await file.text();
        parseRes = parseMarkdown(text);
      } else if (extension === 'docx') {
        parseRes = await parseDOCX(file);
      } else if (extension === 'json') {
        const text = await file.text();
        try {
          const jsonObj = JSON.parse(text);
          if (Array.isArray(jsonObj.questions)) {
            parseRes = {
              title: jsonObj.title,
              topic: jsonObj.topic,
              questions: jsonObj.questions.map((q: any, i: number) => ({
                tempId: `json_${i}`,
                questionText: q.questionText || q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
                correctOptionId: q.correctOptionId || q.answer || 'A',
                explanation: q.explanation,
                isValid: Boolean(q.questionText || q.question)
              })),
              errors: []
            };
          } else {
            parseRes = parsePlainText(text);
          }
        } catch {
          parseRes = parsePlainText(text);
        }
      } else {
        const text = await file.text();
        parseRes = parsePlainText(text);
      }

      if (!parseRes.questions || parseRes.questions.length === 0) {
        setErrorMsg('Could not detect any MCQs in this file. Click "Format Guide" below to see example templates.');
      } else {
        onParsedResult(parseRes, file.name);
      }
    } catch (err: any) {
      setErrorMsg(`Error reading file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Please paste quiz text or answer key first.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    setTimeout(() => {
      const parseRes = parsePlainText(pastedText);
      if (!parseRes.questions || parseRes.questions.length === 0) {
        setErrorMsg('No MCQs found in pasted text. Click "Format Guide" to see exact copy-paste examples.');
      } else {
        onParsedResult(parseRes, 'Pasted Text');
      }
      setIsProcessing(false);
    }, 200);
  };

  const handleDownloadSingleCSVTemplate = () => {
    const csvContent = `"Question","Option A","Option B","Option C","Option D","Correct Answer","Explanation"
"Who coined the term 'Bibliometrics' in 1969?","Paul Otlet","Alan Pritchard","S.R. Ranganathan","Vassily Nalimov","B","Alan Pritchard coined Bibliometrics in 1969."
"What does PMEST stand for in Colon Classification?","Personality Matter Energy Space Time","Print Media Electronic System Text","Process Method Entity Source Topic","Primary Main Element Secondary Tertiary","A","PMEST stands for Personality, Matter, Energy, Space, Time."`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_single_language_quiz.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBilingualCSVTemplate = () => {
    const csvContent = `"Question_Number","Question_English","Question_Hindi","Option_A","Option_B","Option_C","Option_D","Correct_Answer","Explanation_English","Explanation_Hindi"
"1","Who coined the term 'Bibliometrics' in 1969?","1969 में बिब्लियोमेट्रिक्स शब्द का प्रतिपादन किसने किया था?","Paul Otlet (पॉल ओटलेट)","Alan Pritchard (एलन प्रिचर्ड)","S.R. Ranganathan (एस.आर. रंगनाथन)","Vassily Nalimov (वसीली नलीमोव)","B","Alan Pritchard coined Bibliometrics in 1969.","एलन प्रिचर्ड ने 1969 में यह शब्द दिया।"
"2","Paul Otlet first utilized 'bibliométrie' in which publication?","पॉल ओटलेट ने 1934 में किस पुस्तक में 'bibliométrie' लिखा?","Traité de Documentation","Classification Décimale Universelle","Manuel de la Documentation","Sciences de l'information","A","Paul Otlet used it in Traité de Documentation (1934).","पॉल ओटलेट ने ट्रेट डी डॉक्यूमेंटेशन (1934) में इसका प्रयोग किया।"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_bilingual_quiz.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSampleText = () => {
    const sample = `Question 1 [Unit 1: Epistemological Development]
English: Who coined the term 'Bibliometrics' in his seminal 1969 paper, officially replacing E. Wyndham Hulme's older term 'Statistical Bibliography'?

हिन्दी: 1969 में अपने प्रसिद्ध शोध पत्र में 'बिब्लियोमेट्रिक्स' शब्द का प्रतिपादन किसने किया था?

Options / विकल्प:
A) Paul Otlet (पॉल ओटलेट)
B) Alan Pritchard (एलन प्रिचर्ड)
C) S.R. Ranganathan (एस.आर. रंगनाथन)
D) Vassily Nalimov (वसीली नलीमोव)
Answer: B
Explanation: Alan Pritchard coined Bibliometrics in 1969 in his paper "Statistical Bibliography or Bibliometrics?".

Question 2 [Unit 1: Epistemological Development]
English: Paul Otlet first utilized the French equivalent term 'bibliométrie' in which of his landmark publications in 1934?

हिन्दी: पॉल ओटलेट ने 1934 में अपने किस प्रकाशन में पहली बार 'bibliométrie' का उपयोग किया था?

Options / विकल्प:
A) Traité de Documentation (ट्रेट डी डॉक्यूमेंटेशन)
B) Classification Décimale Universelle
C) Manuel de la Documentation
D) Sciences de l'information
Answer: A
Explanation: Paul Otlet used 'bibliométrie' in Traité de Documentation (1934).`;

    setPastedText(sample);
    setActiveInputType('paste');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">Smart MCQ Converter Studio</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Upload any document format containing questions and answer keys. Our engine automatically parses and converts them into interactive MCQs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Format Guide & Rules</span>
            </button>

            <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveInputType('file')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeInputType === 'file'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upload Document File
              </button>
              <button
                onClick={() => setActiveInputType('paste')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeInputType === 'paste'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paste Raw Text
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Formats Pill Bar & Template Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl flex flex-col justify-between border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">CSV Templates</h4>
          </div>

          <div className="flex flex-col space-y-1">
            <button
              onClick={handleDownloadSingleCSVTemplate}
              className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>Single-Lang CSV</span>
            </button>
            <button
              onClick={handleDownloadBilingualCSVTemplate}
              className="text-[11px] text-indigo-700 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3 h-3 text-indigo-600" />
              <span>Bilingual CSV (En+Hi)</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl flex items-center space-x-3 border border-indigo-200 shadow-xs">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Markdown (.md)</h4>
            <p className="text-[11px] text-slate-500 font-medium">Q1., A) B) C) D), Ans: B</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl flex items-center space-x-3 border border-blue-200 shadow-xs">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Word (.docx)</h4>
            <p className="text-[11px] text-slate-500 font-medium">Structured DOCX Q&A docs</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl flex items-center space-x-3 border border-amber-200 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <File className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Text & Sample</h4>
            <button
              onClick={handleLoadSampleText}
              className="text-[11px] text-amber-700 font-bold hover:underline flex items-center space-x-1 mt-0.5"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Sample Loaded!' : 'Load Sample Format'}</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 text-sm font-semibold">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-800 text-xs font-bold whitespace-nowrap hover:bg-rose-100"
            >
              View Format Guide
            </button>
            <button
              onClick={handleLoadSampleText}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold whitespace-nowrap shadow-xs hover:bg-rose-700"
            >
              Load Sample Text
            </button>
          </div>
        </div>
      )}

      {/* Main Upload Dropzone */}
      {activeInputType === 'file' ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-white border-2 border-dashed p-10 rounded-2xl text-center cursor-pointer transition-all duration-150 ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .md, .markdown, .docx, .txt, .json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileChange(file);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
            {isProcessing ? (
              <Sparkles className="w-8 h-8 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            {isProcessing ? 'Parsing File & Extracting Questions...' : 'Drag & Drop Quiz Document Here'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 font-medium">
            Supported formats: <span className="font-bold text-indigo-700">.csv</span>, <span className="font-bold text-indigo-700">.md</span>, <span className="font-bold text-indigo-700">.docx</span>, <span className="font-bold text-indigo-700">.txt</span>, or <span className="font-bold text-indigo-700">.json</span>
          </p>

          <button
            type="button"
            className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 inline-flex items-center space-x-2 transition-all"
          >
            <span>Browse File from Computer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Direct Text Paste Area */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-bold text-slate-900">
              Paste Quiz Content with Answer Keys
            </label>
            <button
              onClick={handleLoadSampleText}
              className="text-xs text-indigo-600 font-bold hover:underline flex items-center space-x-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Load Sample Format</span>
            </button>
          </div>

          <textarea
            rows={12}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Example Format:

Question 1
Who coined the term 'Bibliometrics' in 1969?
A) Paul Otlet
B) Alan Pritchard
C) S.R. Ranganathan
D) Vassily Nalimov
Answer: B
Explanation: Alan Pritchard coined Bibliometrics in 1969.

Question 2
What is the 5th Law of Library Science?
A) Books are for use
B) Every reader his/her book
C) The library is a growing organism
D) Save the time of the reader
Answer: C`}
            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setPastedText('')}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
            >
              Clear Text
            </button>
            <button
              onClick={handlePasteSubmit}
              disabled={isProcessing || !pastedText.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Converting to MCQs...' : 'Parse & Convert to MCQs'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Formatting Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Supported Quiz File Formats</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-6 pr-2 text-xs sm:text-sm text-slate-700">
              
              {/* Single Language CSV Format */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>1. Single-Language CSV Format</span>
                  </h4>
                  <button
                    onClick={handleDownloadSingleCSVTemplate}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Single-Lang CSV</span>
                  </button>
                </div>
                <p className="text-slate-500 text-xs">Headers: <code className="font-mono bg-white border px-1 rounded">Question, Option A, Option B, Option C, Option D, Correct Answer, Explanation</code></p>
                <pre className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] overflow-x-auto text-slate-800">
{`Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation
Who coined Bibliometrics?,Paul Otlet,Alan Pritchard,S.R. Ranganathan,Vassily Nalimov,B,Alan Pritchard coined Bibliometrics in 1969.
What is PMEST?,Personality Matter Energy Space Time,Print Media,Process Method,Primary Main,A,PMEST is Ranganathan's 5 categories.`}
                </pre>
              </div>

              {/* Bilingual CSV Format */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>2. Bilingual CSV Format (English + Hindi Separate Columns)</span>
                  </h4>
                  <button
                    onClick={handleDownloadBilingualCSVTemplate}
                    className="text-xs text-indigo-700 font-bold hover:underline flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Bilingual CSV</span>
                  </button>
                </div>
                <p className="text-slate-500 text-xs">Headers: <code className="font-mono bg-white border px-1 rounded">Question_Number, Question_English, Question_Hindi, Option_A, Option_B, Option_C, Option_D, Correct_Answer, Explanation_English, Explanation_Hindi</code></p>
                <pre className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] overflow-x-auto text-slate-800">
{`Question_Number,Question_English,Question_Hindi,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation_English,Explanation_Hindi
1,Who coined Bibliometrics?,1969 में बिब्लियोमेट्रिक्स शब्द किसने दिया?,Paul Otlet,Alan Pritchard,S.R. Ranganathan,Vassily Nalimov,B,Coined in 1969.,1969 में प्रतिपादन किया।`}
                </pre>
              </div>

              {/* Plain Text / DOCX / Markdown Format */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>3. Plain Text / Word (.docx) / Markdown (.md)</span>
                </h4>
                <p className="text-slate-500 text-xs">Use <code className="font-mono bg-white border px-1 rounded">Question 1</code>, options <code className="font-mono bg-white border px-1 rounded">A) B) C) D)</code>, and <code className="font-mono bg-white border px-1 rounded">Answer: B</code> inline.</p>
                <pre className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] overflow-x-auto text-slate-800">
{`Question 1
Who coined the term 'Bibliometrics' in 1969?

Options:
A) Paul Otlet
B) Alan Pritchard
C) S.R. Ranganathan
D) Vassily Nalimov

Answer: B
Explanation: Alan Pritchard coined Bibliometrics in 1969.`}
                </pre>
              </div>

            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
