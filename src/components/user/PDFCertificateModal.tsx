import React, { useRef, useEffect } from 'react';
import { X, Download, Award, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PDFCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  quizTitle: string;
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  date: string;
  attemptId: string;
}

export const PDFCertificateModal: React.FC<PDFCertificateModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  quizTitle,
  topic,
  score,
  maxScore,
  percentage,
  date,
  attemptId,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Evalnium_Merit_Certificate_${candidateName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate certificate PDF:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-4xl w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-4 my-8 animate-in fade-in duration-300">
        
        {/* Top Controls Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">Evalnium Certificate of Academic Merit</h3>
              <p className="text-[11px] text-slate-400 font-medium">Official Digital Credentials</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Certificate</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / PDF Certificate Canvas Area */}
        <div className="p-4 sm:p-8 flex justify-center bg-slate-100">
          <div
            ref={certificateRef}
            className="w-full max-w-[850px] bg-white border-[12px] border-slate-900 p-8 sm:p-12 rounded-2xl relative shadow-2xl text-center space-y-6 overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(245, 243, 255, 0.5) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            {/* Outer Gold Accent Border Frame */}
            <div className="absolute inset-2 border-2 border-amber-400/60 rounded-xl pointer-events-none" />
            <div className="absolute inset-3 border border-slate-200 rounded-lg pointer-events-none" />

            {/* Header Badge */}
            <div className="flex justify-center items-center space-x-2 text-indigo-900 font-black text-xs uppercase tracking-[4px]">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Evalnium Assessment Portal</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif font-black text-slate-900 tracking-tight">
                Certificate of Academic Excellence
              </h1>
              <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-1">
                Issued for Distinction & Mastery
              </p>
            </div>

            <p className="text-xs text-slate-500 font-medium italic">This official certificate is proudly presented to</p>

            {/* Candidate Name */}
            <div className="py-2 border-b-2 border-slate-900 max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-950 capitalize tracking-wide">
                {candidateName}
              </h2>
            </div>

            {/* Achievement Description */}
            <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed font-medium">
              for successfully completing and passing the Computer-Based Assessment on{' '}
              <strong className="text-slate-900 font-bold">"{quizTitle}"</strong> ({topic}) with an outstanding score of{' '}
              <strong className="text-emerald-700 font-extrabold">{score} / {maxScore} ({percentage.toFixed(1)}%)</strong>.
            </p>

            {/* Gold Seal & Verification Details Grid */}
            <div className="grid grid-cols-3 items-end pt-6 border-t border-slate-200/80 mt-6">
              
              {/* Left: Issue Date & Verification Code */}
              <div className="text-left space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Date of Issuance</p>
                <p className="text-xs font-bold text-slate-800">{new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p className="text-[9px] text-slate-400 font-mono mt-1">Cred ID: EV-{attemptId.slice(0, 10).toUpperCase()}</p>
              </div>

              {/* Center: Official Gold Embossed Stamp */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 p-1 shadow-lg shadow-amber-500/30 flex items-center justify-center relative">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-amber-100 flex flex-col items-center justify-center bg-amber-500 text-white p-2">
                    <ShieldCheck className="w-7 h-7 text-amber-100" />
                    <span className="text-[8px] font-black tracking-widest uppercase mt-0.5">VERIFIED</span>
                  </div>
                </div>
              </div>

              {/* Right: Signature & Stamp */}
              <div className="text-right space-y-1">
                <div className="font-serif italic text-base font-bold text-slate-900">Arshad Abdul</div>
                <div className="w-32 h-0.5 bg-slate-900 ml-auto" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Controller of Examinations</p>
                <p className="text-[9px] text-slate-400 font-medium">Evalnium Assessment Body</p>
              </div>

            </div>

            {/* Bottom Verification Footer */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 font-medium">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Authenticity Secured by Evalnium Server</span>
              </span>
              <span>evalnium.org/verify</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
