import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Ticket, Printer, Download, X, AlertTriangle, ShieldCheck, Clock, User, Calendar, MapPin, Building, QrCode } from 'lucide-react';
import type { Quiz } from '../../types/quiz';

interface HallTicketModalProps {
  quiz: Quiz;
  candidateName: string;
  candidateEmail?: string;
  onClose: () => void;
  onStartExam?: () => void;
}

export const HallTicketModal: React.FC<HallTicketModalProps> = ({
  quiz,
  candidateName,
  candidateEmail,
  onClose,
  onStartExam,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const ticketRef = useRef<HTMLDivElement>(null);

  const rollNumber = `EVL-2026-${Math.abs((candidateName + quiz.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000) % 90000) + 10000}`;
  const verificationPayload = JSON.stringify({
    roll: rollNumber,
    name: candidateName,
    quizId: quiz.id,
    time: quiz.scheduledStartDateTime || 'Instant Schedule',
  });

  useEffect(() => {
    QRCode.toDataURL(verificationPayload, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [verificationPayload]);

  const handlePrint = () => {
    window.print();
  };

  const scheduleStart = quiz.scheduledStartDateTime
    ? new Date(quiz.scheduledStartDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Open CBT Examination Slot';

  const scheduleEnd = quiz.scheduledEndDateTime
    ? new Date(quiz.scheduledEndDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Anytime Instant Assessment';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Ticket className="w-5 h-5 text-indigo-400" />
            <span className="font-extrabold text-sm tracking-wide">
              Official Examination Hall Ticket & Admit Card
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Admit Card</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admit Card Body */}
        <div ref={ticketRef} className="p-6 sm:p-8 space-y-6 text-slate-800 font-sans">
          {/* Official Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 text-white flex items-center justify-center font-black text-lg">
                EV
              </div>
              <div>
                <h1 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tight">
                  EVALNIUM NATIONAL TESTING AUTHORITY
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Computer-Based Test (CBT) Provisional Admit Card
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Roll Number</div>
              <div className="text-base font-black text-indigo-700">{rollNumber}</div>
            </div>
          </div>

          {/* Candidate & Exam Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 rounded-2xl p-4 bg-slate-50 text-xs">
            {/* Candidate Identity */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase font-bold text-indigo-900 border-b border-slate-200 pb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Candidate Information</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Candidate Name:</span>
                <span className="font-bold text-slate-900 text-sm">{candidateName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Registered Email:</span>
                <span className="font-mono font-medium text-slate-700">{candidateEmail || 'Direct Candidate'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Candidate Category:</span>
                <span className="font-bold text-slate-800">General / Open Merit</span>
              </div>
            </div>

            {/* Examination Slot & Schedule */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase font-bold text-indigo-900 border-b border-slate-200 pb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Exam Schedule</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Paper Name:</span>
                <span className="font-bold text-slate-900 line-clamp-1">{quiz.title}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Exam Window / Slot:</span>
                <span className="font-mono font-bold text-slate-800">{scheduleStart}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Duration:</span>
                <span className="font-bold text-indigo-700 font-mono">{quiz.timeLimitMinutes} Minutes ({quiz.questions.length} MCQs)</span>
              </div>
            </div>

            {/* Center & QR Code Verification */}
            <div className="flex flex-col justify-between items-center text-center p-2 bg-white rounded-xl border border-slate-200">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Admit Card QR" className="w-24 h-24" />
              ) : (
                <div className="w-24 h-24 bg-slate-200 animate-pulse rounded" />
              )}
              <div className="mt-1">
                <span className="text-[9px] font-mono font-bold text-indigo-900 block">
                  Digital Verification QR
                </span>
                <span className="text-[8px] text-slate-400 font-mono">
                  Test Center Node: EVL-VIRTUAL-01
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Instructions */}
          <div className="space-y-2 text-[11px] text-slate-600 bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
            <h4 className="font-bold text-amber-900 flex items-center space-x-1.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Mandatory Candidate Instructions for CBT Examination:</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1 font-medium">
              <li>Candidates must strictly maintain full-screen mode. Tab switching or window blur is automatically logged.</li>
              <li>Calculators, smart devices, and auxiliary browser extensions are strictly monitored by the live radar.</li>
              <li>Each question palette box indicates: <strong className="text-emerald-700">Green (Answered)</strong>, <strong className="text-amber-700">Yellow (Marked for Review)</strong>, and <strong className="text-slate-700">Gray (Not Visited)</strong>.</li>
              <li>The digital clock in the top banner is synchronized to National Examination Standard Time.</li>
            </ul>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Close Admit Card
            </button>

            {onStartExam && (
              <button
                onClick={() => {
                  onClose();
                  onStartExam();
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center space-x-2 transition-all cursor-pointer"
              >
                <span>Proceed to CBT Examination Terminal →</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
