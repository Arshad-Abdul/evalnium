import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, Sparkles, X, CheckCircle, ShieldCheck, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { registerCandidate, loginCandidate } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register'>('register');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP Verification State
  const [step, setStep] = useState<'details' | 'otp_verify'>('details');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: any;
    if (step === 'otp_verify' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  if (!isOpen) return null;

  const generateNewOtp = () => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError(null);
    setResendTimer(30);
    return randomOtp;
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    generateNewOtp();
    setStep('otp_verify');
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setOtpError(null);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the OTP.');
      return;
    }

    if (enteredOtp !== generatedOtp) {
      setOtpError('Incorrect OTP entered. Please check and try again.');
      return;
    }

    // OTP Verified! Complete registration / login
    if (tab === 'register') {
      registerCandidate(name || 'Candidate', email);
      setSuccessMsg('✅ OTP Verified & Candidate Account Registered Successfully!');
    } else {
      loginCandidate(email, name);
      setSuccessMsg('✅ OTP Verified & Signed In Successfully!');
    }

    setTimeout(() => {
      setSuccessMsg(null);
      setStep('details');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xl space-y-6 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {step === 'otp_verify' ? 'OTP Email Verification' : 'Student Access Portal'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {step === 'otp_verify' ? `Verification code sent to ${email}` : 'Join candidate network to track ranks & performance'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setStep('details');
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Form Details */}
        {step === 'details' && (
          <>
            {/* Tab Switcher */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setTab('register')}
                className={`w-1/2 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === 'register'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => setTab('signin')}
                className={`w-1/2 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === 'signin'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              {tab === 'register' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Full Candidate Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arshad Abdul"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all mt-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Send Verification OTP 📩</span>
              </button>
            </form>
          </>
        )}

        {/* Step 2: 6-Digit OTP Verification Screen */}
        {step === 'otp_verify' && (
          <div className="space-y-5">
            {/* Live OTP Notification Banner */}
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium space-y-1">
              <div className="flex items-center justify-between font-bold text-indigo-950">
                <span>📩 OTP Sent to {email}</span>
                <span className="text-[10px] font-mono bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded">6-Digit Code</span>
              </div>
              <p className="text-[11px] text-indigo-700 font-mono">
                Verification Code: <strong className="text-indigo-950 text-sm tracking-widest bg-white px-2 py-0.5 rounded border border-indigo-200">{generatedOtp}</strong>
              </p>
            </div>

            {successMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 text-center">
                    Enter 6-Digit Verification OTP
                  </label>

                  {/* 6 OTP Boxes */}
                  <div className="flex items-center justify-center gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="w-11 h-12 text-center font-mono text-lg font-black rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-xs transition-all"
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="text-center text-xs text-rose-600 font-bold mt-2 animate-bounce">
                      {otpError}
                    </p>
                  )}
                </div>

                {/* Resend Timer & Actions */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="hover:text-slate-900 flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Email</span>
                  </button>

                  <button
                    type="button"
                    disabled={resendTimer > 0}
                    onClick={generateNewOtp}
                    className="hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Now'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Verify OTP & Complete Sign In</span>
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
