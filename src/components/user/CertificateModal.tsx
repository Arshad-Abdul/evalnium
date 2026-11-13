import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Award, CheckCircle, Download, Printer, ShieldCheck, X, Sparkles, ExternalLink, QrCode } from 'lucide-react';
import type { QuizAttemptResult } from '../../types/quiz';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CertificateModalProps {
  result: QuizAttemptResult;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ result, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const certId = `CERT-EVL-${result.id ? result.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() : Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  const verificationUrl = `${window.location.origin}/verify/${result.id}`;

  useEffect(() => {
    // Generate high-resolution QR Code
    QRCode.toDataURL(verificationUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR Code:', err));
  }, [verificationUrl]);

  const handleDownloadPDF = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const computed = window.getComputedStyle(el);
            if (computed.color && computed.color.startsWith('rgb')) {
              (el as HTMLElement).style.color = computed.color;
            }
            if (computed.backgroundColor && computed.backgroundColor.startsWith('rgb') && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
              (el as HTMLElement).style.backgroundColor = computed.backgroundColor;
            }
            if (computed.borderColor && computed.borderColor.startsWith('rgb')) {
              (el as HTMLElement).style.borderColor = computed.borderColor;
            }
          });
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(`Evalnium_Certificate_${result.candidateName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('PDF Generation failed:', e);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(result.attemptedAt || Date.now()).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-sm tracking-wide">
              Verified Certificate of Completion
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Exporting PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Print Certificate"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas Area */}
        <div className="p-4 sm:p-8 bg-slate-100 flex justify-center">
          <div
            ref={certRef}
            className="w-full max-w-[850px] aspect-[1.414/1] bg-[#fffdf9] p-8 sm:p-12 rounded-2xl border-[10px] border-double border-indigo-950 shadow-xl relative flex flex-col justify-between text-slate-900 overflow-hidden font-sans select-none"
            style={{ backgroundColor: '#fffdf9', borderColor: '#1e1b4b', color: '#0f172a' }}
          >
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <span className="text-[120px] font-black tracking-widest text-indigo-950 uppercase rotate-[-25deg]">
                EVALNIUM
              </span>
            </div>

            {/* Corner Decorative Motifs */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-600" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-600" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-600" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-600" />

            {/* Certificate Header */}
            <div className="text-center space-y-1 relative z-10">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-black text-sm">
                  EV
                </div>
                <span className="font-black text-xl tracking-wider text-indigo-950 uppercase">
                  EVALNIUM ONLINE PRACTICE PORTAL
                </span>
              </div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                Library &amp; Information Science (LIS) Practice Assessment
              </p>
              <div className="pt-1.5">
                <h1 className="text-2xl sm:text-3xl font-serif font-black text-indigo-950 tracking-wide uppercase">
                  {result.percentage >= 60 ? 'Certificate of Merit' : 'Certificate of Completion'}
                </h1>
                <div className="w-24 h-0.5 bg-amber-600 mx-auto mt-1" />
              </div>
            </div>

            {/* Recipient Details & Core Statement */}
            <div className="text-center space-y-3 relative z-10 my-auto px-4">
              <p className="text-xs text-slate-500 font-medium italic">
                This is to certify that
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-tight border-b-2 border-dashed border-indigo-950 pb-1 max-w-md mx-auto">
                {result.candidateName}
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-700 max-w-xl mx-auto leading-relaxed">
                has successfully appeared for and completed the online Computer-Based Practice Test{' '}
                <strong className="text-indigo-950 font-bold">"{result.quizTitle || result.topic}"</strong> on the Evalnium Assessment Portal, achieving a score of{' '}
                <strong className="text-emerald-700 font-black">{result.score} / {result.maxScore} ({result.percentage.toFixed(1)}%)</strong> on {formattedDate}.
              </p>
            </div>

            {/* Score & Evaluation Metrics Strip */}
            <div className="relative z-10 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 grid grid-cols-4 gap-2 text-center font-mono">
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Marks Secured</div>
                <div className="text-sm sm:text-base font-black text-slate-900">{result.score} / {result.maxScore}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Percentage</div>
                <div className="text-sm sm:text-base font-black text-indigo-700">{result.percentage.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Result Status</div>
                <div className="text-sm sm:text-base font-black text-emerald-700">
                  {result.passed ? 'QUALIFIED' : 'COMPLETED'}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Issue Date</div>
                <div className="text-xs sm:text-sm font-bold text-slate-800">{formattedDate}</div>
              </div>
            </div>

            {/* Certificate Footer with Dynamic QR Code & Authority Signatures */}
            <div className="flex items-end justify-between pt-4 border-t border-slate-200 relative z-10">
              {/* Dynamic QR Code */}
              <div className="flex items-center space-x-3">
                {qrDataUrl ? (
                  <div className="p-1 bg-white border border-slate-300 rounded shadow-xs">
                    <img src={qrDataUrl} alt="Verification QR Code" className="w-16 h-16" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-200 animate-pulse rounded" />
                )}
                <div className="text-left font-mono">
                  <div className="text-[9px] font-bold text-indigo-900 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Scan to Verify Online</span>
                  </div>
                  <div className="text-[8px] text-slate-500 truncate max-w-[140px]">
                    ID: {certId}
                  </div>
                  <div className="text-[8px] text-slate-400">
                    evalnium.app/verify
                  </div>
                </div>
              </div>

              {/* Gold Holographic Seal */}
              <div className="hidden sm:flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 flex items-center justify-center text-indigo-950 font-black text-[9px] uppercase tracking-tighter text-center p-1 shadow-md border-2 border-yellow-200 rotate-[-10deg]">
                  Verified &amp; Completed
                </div>
              </div>

              {/* Authorized Signatory */}
              <div className="text-right">
                <div className="font-serif italic font-bold text-xl text-indigo-950 tracking-wider">
                  Evalnium
                </div>
                <div className="w-24 h-0.5 bg-indigo-950 ml-auto my-1" />
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Evalnium Online Practice Portal
                </div>
              </div>
            </div>

            {/* Mandatory Regulatory / Educational Disclaimer */}
            <div className="pt-2 text-center relative z-10">
              <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-tight">
                This certificate is issued by Evalnium for self-assessment, practice motivation, and academic progress tracking only. It does not constitute an official government appointment or academic degree.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
