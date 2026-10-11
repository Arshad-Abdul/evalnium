import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Camera, AlertTriangle, Eye, VideoOff } from 'lucide-react';

interface ProctoringMonitorProps {
  quizId: string;
  candidateName: string;
  candidateEmail?: string;
  enableCameraProctoring?: boolean;
  onViolationAlert?: (message: string) => void;
}

export const ProctoringMonitor: React.FC<ProctoringMonitorProps> = ({
  quizId,
  candidateName,
  candidateEmail,
  enableCameraProctoring = true,
  onViolationAlert,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const getApiBaseUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api`;
  };

  const sessionId = useRef(`proc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`).current;

  // Initialize Camera Stream if supported
  useEffect(() => {
    if (!enableCameraProctoring) return;

    let localStream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((s) => {
        localStream = s;
        setStream(s);
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.warn('Webcam proctoring not permitted or not available:', err.message);
        setCameraActive(false);
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [enableCameraProctoring]);

  const captureSnapshot = (): string | null => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return null;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 320, 240);
        return canvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (e) {
      console.error('Error capturing snapshot:', e);
    }
    return null;
  };

  const logViolation = async (violationType: string, details: string) => {
    const snapshotBase64 = captureSnapshot();
    setViolationCount((prev) => prev + 1);

    setWarningMessage(details);
    setShowWarningModal(true);
    if (onViolationAlert) onViolationAlert(details);

    try {
      await fetch(`${getApiBaseUrl()}/proctoring/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          quizId,
          candidateName,
          candidateEmail,
          violationType,
          details,
          snapshotBase64,
        }),
      });
    } catch (e) {
      console.error('Failed to dispatch proctoring violation log:', e);
    }
  };

  // Window Blur & Tab Switch Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('TAB_SWITCH', 'Candidate switched away from the active examination browser tab.');
      }
    };

    const handleWindowBlur = () => {
      logViolation('WINDOW_BLUR', 'Candidate navigated outside the examination window.');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation('FULLSCREEN_EXIT', 'Candidate exited full-screen examination mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [quizId, candidateName]);

  return (
    <>
      {/* Discreet Live Proctoring Radar Badge in Testing Header */}
      <div className="flex items-center space-x-2 bg-slate-900 text-white px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono select-none">
        <div className="relative flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>

        <span className="font-bold text-slate-300">Proctoring AI</span>

        {cameraActive ? (
          <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
            <Camera className="w-3 h-3" />
            <span>Cam Active</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1 text-slate-400">
            <ShieldCheck className="w-3 h-3 text-indigo-400" />
            <span>Tab Shield</span>
          </span>
        )}

        {violationCount > 0 && (
          <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800 text-[9px]">
            {violationCount} {violationCount === 1 ? 'Warning' : 'Warnings'}
          </span>
        )}
      </div>

      {/* Hidden Video & Canvas for Snapshot Processing */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Violation Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border-2 border-rose-500 shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-lg text-slate-900">
                Security & Anti-Cheating Violation Warning
              </h3>
              <p className="text-xs text-rose-600 font-bold">
                Warning #{violationCount} Recorded in National Audit Log
              </p>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
              {warningMessage}
            </p>

            <p className="text-[11px] text-slate-400 font-medium">
              Please stay focused on the CBT window. Further violations may lead to automatic test disqualification.
            </p>

            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              I Understand & Return to Examination
            </button>
          </div>
        </div>
      )}
    </>
  );
};
