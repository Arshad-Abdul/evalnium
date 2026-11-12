import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminLockModalProps {
  onUnlock: () => void;
  onCancel: () => void;
}

export const AdminLockModal: React.FC<AdminLockModalProps> = ({
  onUnlock,
  onCancel,
}) => {
  const { loginAdmin } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await loginAdmin(passcode);
    if (success) {
      setErrorMsg(null);
      onUnlock();
    } else {
      setErrorMsg('Incorrect Admin Passcode. Access Denied!');
      setPasscode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-5 sm:p-6 rounded-xl border border-slate-200 space-y-5 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>Admin Studio Access</span>
                <ShieldCheck className="w-4 h-4 text-slate-500" />
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your administrative passcode to manage exams and settings.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Admin Passcode</span>
            </label>

            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                autoFocus
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              className="w-2/3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Unlock Admin Studio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
