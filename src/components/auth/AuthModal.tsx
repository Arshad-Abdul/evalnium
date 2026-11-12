import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, X, CheckCircle, ShieldCheck, KeyRound, RefreshCw, ArrowLeft, Loader2, Phone, MapPin, Briefcase, Building2, GraduationCap } from 'lucide-react';
import { LegalPolicyModal, type LegalDocType } from '../common/LegalPolicyModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { registerCandidate, loginCandidate, resetPassword } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register' | 'forgot_password'>('register');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [occupationStatus, setOccupationStatus] = useState('Student');
  const [designation, setDesignation] = useState('');
  const [universityInstitute, setUniversityInstitute] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);

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

    if (tab === 'register') {
      if (!phone.trim()) {
        setOtpError('Mobile / Phone number is compulsory for registration.');
        return;
      }
      if (!city.trim()) {
        setOtpError('City of residence is compulsory for registration.');
        return;
      }
      if (!termsAccepted) {
        setOtpError('Please agree to the Terms & Conditions and Privacy Policy to continue.');
        return;
      }
    }

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

    let verificationToken = '';
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
      verificationToken = data.verificationToken || '';
    } catch {
      setIsLoading(false);
      setOtpError('Network error while verifying OTP. Please try again.');
      return;
    }

    // OTP Verified! Complete registration or reset password
    try {
      if (tab === 'forgot_password') {
        await resetPassword(email, verificationToken || enteredOtp, password);
        setSuccessMsg('✅ Password Reset Successfully! You can now log in.');
      } else {
        await registerCandidate(
          name || 'Candidate',
          email,
          password,
          {
            phone: phone.trim(),
            city: city.trim(),
            gender,
            occupation_status: occupationStatus,
            designation: designation.trim() || undefined,
            university_institute: universityInstitute.trim() || undefined,
            termsAccepted: true,
          },
          verificationToken
        );
        setSuccessMsg('Email verified and candidate account created successfully.');
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xl space-y-5 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {step === 'otp_verify' ? 'Email OTP Verification' : tab === 'forgot_password' ? 'Reset Password' : 'Candidate Sign In'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'otp_verify' ? `Enter the verification code sent to ${email}` : tab === 'forgot_password' ? 'Enter email and new password' : 'Track scores, revisions, and exam standings'}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setStep('details');
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Form Details */}
        {step === 'details' && (
          <>
            {tab !== 'forgot_password' ? (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className={`w-1/2 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    tab === 'register'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
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
                <>
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

                  {/* Mandatory Phone & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        City of Residence <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Hyderabad, Delhi"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gender & Occupation Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Prefer not to say">Prefer not to say</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Candidate Category</label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                        <select
                          value={occupationStatus}
                          onChange={(e) => setOccupationStatus(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Student">Student</option>
                          <option value="Trainee">Trainee</option>
                          <option value="Intern">Intern</option>
                          <option value="Working Professional">Working Professional</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Designation & University/Institute */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Current Designation</label>
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g. Scholar, Student"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">University / College</label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={universityInstitute}
                          onChange={(e) => setUniversityInstitute(e.target.value)}
                          placeholder="e.g. IITH, DU, JNU"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
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

              {tab === 'register' && (
                <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (e.target.checked) setOtpError(null);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer shrink-0"
                  />
                  <span className="leading-relaxed">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setLegalDoc('terms');
                      }}
                      className="font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setLegalDoc('privacy');
                      }}
                      className="font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    , including exam conduct rules and academic email updates.
                  </span>
                </label>
              )}

              {tab === 'signin' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setTab('forgot_password')}
                    className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Verification OTP...</span>
                  </>
                ) : tab === 'signin' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                ) : tab === 'forgot_password' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send OTP to Reset Password</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Email &amp; Create Account</span>
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
                    <p className="text-center text-xs text-rose-600 font-semibold mt-2">
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
                      <CheckCircle className="w-4 h-4" />
                      <span>Verify Email & Complete Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
      <LegalPolicyModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
};
