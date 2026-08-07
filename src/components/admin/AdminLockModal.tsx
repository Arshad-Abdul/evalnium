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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginAdmin(passcode);
    if (success) {
      setErrorMsg(null);
      onUnlock();
    } else {
      setErrorMsg('Incorrect Admin Passcode. Access Denied!');
      setPasscode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>Admin Passcode Protection</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Enter master passcode to upload quizzes & manage platform settings.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2 animate-bounce">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Admin Secret Passcode</span>
            </label>

            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (Default: admin123)"
                autoFocus
                className="w-full p-3.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
              Default passcode: <code className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">admin123</code>
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-98"
            >
              Unlock Admin Studio 🔓
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
