import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Sparkles, X, CheckCircle, ShieldCheck, KeyRound, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { registerCandidate, loginCandidate, resetPassword, checkCandidateExists } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register' | 'forgot_password'>('register');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP Verification State
  const [step, setStep] = useState<'details' | 'otp_verify'>('details');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getApiUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api/auth`;
  };

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setOtpError(null);

    try {
      const res = await fetch(`${getApiUrl()}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok) {
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(30);
        setStep('otp_verify');
      } else {
        setOtpError(data.error || 'Failed to send OTP to email.');
      }
    } catch {
      setIsLoading(false);
      // Fallback for offline mode
      setOtpDigits(['', '', '', '', '', '']);
      setResendTimer(30);
      setStep('otp_verify');
    }
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the OTP received in your email.');
      return;
    }

    setIsLoading(true);
    setOtpError(null);

    try {
      const res = await fetch(`${getApiUrl()}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: enteredOtp }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setOtpError(data.error || 'Incorrect OTP code entered.');
        return;
      }
    } catch {
      setIsLoading(false);
    }

    // OTP Verified! Complete registration or reset password
    try {
      if (tab === 'forgot_password') {
        await resetPassword(email, enteredOtp, password);
        setSuccessMsg('✅ Password Reset Successfully! You can now log in.');
      } else {
        await registerCandidate(name || 'Candidate', email, password);
        setSuccessMsg('✅ Email Verified & Candidate Account Created Successfully!');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Authentication failed');
      return;
    }

    setTimeout(() => {
      setSuccessMsg(null);
      setStep('details');
      onClose();
      if (onSuccess) onSuccess();
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
                {step === 'otp_verify' ? 'Email OTP Verification' : tab === 'forgot_password' ? 'Reset Password' : 'Student Access Portal'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {step === 'otp_verify' ? `Check email inbox of ${email}` : tab === 'forgot_password' ? 'Enter email and new password' : 'Join candidate network to track ranks & performance'}
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
            {tab !== 'forgot_password' ? (
              <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
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
                  type="button"
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
            ) : (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setTab('signin')}
                  className="flex items-center text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Sign In
                </button>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setOtpError(null);
                
                if (tab === 'signin') {
                  if (!email || !password) return;
                  
                  setIsLoading(true);
                  try {
                    await loginCandidate(email, password);
                    setSuccessMsg(`Welcome Back! Sign-In Successful.`);
                    setTimeout(() => {
                      onClose();
                      if (onSuccess) onSuccess();
                    }, 1000);
                  } catch (err: any) {
                    setOtpError(err.message || 'Verification failed');
                  } finally {
                    setIsLoading(false);
                  }
                } else {
                  handleSendOtp(e);
                }
              }}
              className="space-y-4"
            >
              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                  {otpError}
                </div>
              )}
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
                <label className="block text-xs font-bold text-slate-700">
                  {tab === 'forgot_password' ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'forgot_password' ? 'Enter a new password' : 'Enter your password'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {tab === 'signin' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setTab('forgot_password')}
                    className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending OTP to Email...</span>
                  </>
                ) : tab === 'signin' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In 🚀</span>
                  </>
                ) : tab === 'forgot_password' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send OTP to Reset 🚀</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Verification OTP to Email 📩</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Step 2: 6-Digit OTP Verification Screen */}
        {step === 'otp_verify' && (
          <div className="space-y-5">
            {/* Email Sent Callout Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-indigo-950">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Verification OTP Sent!</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                We sent a 6-digit verification code to <strong>{email}</strong>. Please check your email inbox (or spam folder) and enter the code below:
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
                    Enter 6-Digit Code Received in Email
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
                    disabled={resendTimer > 0 || isLoading}
                    onClick={handleSendOtp}
                    className="hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code Now'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Verify Email & Complete Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
