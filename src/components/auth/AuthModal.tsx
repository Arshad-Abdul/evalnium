import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, X, CheckCircle, ShieldCheck, KeyRound, RefreshCw, ArrowLeft, Loader2, Phone, MapPin, Briefcase, Building2, GraduationCap } from 'lucide-react';
import { LegalPolicyModal, type LegalDocType } from '../common/LegalPolicyModal';
import { TargetExamSelector, DEFAULT_LIS_EXAM } from './TargetExamSelector';
import { COUNTRY_CODES } from '../../utils/countryCodes';

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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [occupationStatus, setOccupationStatus] = useState('Student');
  const [designation, setDesignation] = useState('');
  const [universityInstitute, setUniversityInstitute] = useState('');
  const [targetExam, setTargetExam] = useState(DEFAULT_LIS_EXAM);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);

  // OTP Verification State
  const [step, setStep] = useState<'details' | 'otp_verify' | 'new_password'>('details');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      return '/api/auth';
    }
    return 'http://localhost:5050/api/auth';
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
      const cleanName = name.trim();
      if (!cleanName || cleanName.length < 3) {
        setOtpError('Please enter your full legal candidate name (at least 3 characters).');
        return;
      }
      if (!/^[a-zA-Z\s.']{3,60}$/.test(cleanName)) {
        setOtpError('Candidate name should only contain alphabetic letters and spaces.');
        return;
      }
      const cleanPhone = phone.replace(/\D/g, '');
      const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
      if (countryCode === '+91') {
        if (cleanPhone.length !== 10) {
          setOtpError('Mobile number must be strictly 10 digits.');
          return;
        }
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
          setOtpError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
          return;
        }
      } else {
        if (cleanPhone.length < 7 || cleanPhone.length > selectedCountry.maxDigits) {
          setOtpError(`Mobile number for ${selectedCountry.name} must be between 7 and ${selectedCountry.maxDigits} digits.`);
          return;
        }
      }
      const cleanCity = city.trim();
      if (!cleanCity || cleanCity.length < 2) {
        setOtpError('City of residence is compulsory (at least 2 letters).');
        return;
      }
      if (!targetExam.trim()) {
        setOtpError('Please specify your Target Exam Goal.');
        return;
      }
      if (!termsAccepted) {
        setOtpError('Please agree to the Terms & Conditions and Privacy Policy to continue.');
        return;
      }
    }

    setIsLoading(true);
    setOtpError(null);

    // Verify account existence before sending OTP
    try {
      const exists = await checkCandidateExists(email);
      if (tab === 'forgot_password' && !exists) {
        setIsLoading(false);
        setOtpError('No candidate account found with this email. Please verify your email or create an account.');
        return;
      }
      if (tab === 'register' && exists) {
        setIsLoading(false);
        setOtpError('An account with this email already exists. Please sign in or reset your password.');
        return;
      }
    } catch {
      // Continue if network check fails
    }

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

    // If resetting password, advance to the dedicated Set New Password screen
    if (tab === 'forgot_password') {
      setVerifiedToken(verificationToken || enteredOtp);
      setStep('new_password');
      setOtpError(null);
      return;
    }

    // Complete registration
    try {
      await registerCandidate(
        name || 'Candidate',
        email,
        password,
        {
          phone: `${countryCode} ${phone.replace(/\D/g, '')}`,
          city: city.trim(),
          gender,
          occupation_status: occupationStatus,
          designation: designation.trim() || undefined,
          university_institute: universityInstitute.trim() || undefined,
          target_exam: targetExam.trim(),
          termsAccepted: true,
        },
        verificationToken
      );
      setSuccessMsg('Email verified and candidate account created successfully.');
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

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setOtpError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setOtpError(null);
    try {
      await resetPassword(email, verifiedToken, newPassword);
      setSuccessMsg('✅ Password Reset Successfully! You can now sign in.');
      setTimeout(() => {
        setSuccessMsg(null);
        setStep('details');
        setTab('signin');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setVerifiedToken('');
      }, 1500);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
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
                {step === 'otp_verify'
                  ? 'Email OTP Verification'
                  : step === 'new_password'
                    ? 'Set New Password'
                    : tab === 'forgot_password'
                      ? 'Reset Password'
                      : tab === 'register'
                        ? 'Create Candidate Account'
                        : 'Candidate Sign In'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'otp_verify'
                  ? `Enter the 6-digit verification code sent to ${email}`
                  : step === 'new_password'
                    ? `Enter your new account password for ${email}`
                    : tab === 'forgot_password'
                      ? 'Enter your registered email address to receive a reset OTP'
                      : 'Track scores, revisions, and exam standings'}
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
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z\s.']/g, '');
                          setName(val);
                          setOtpError(null);
                        }}
                        placeholder="Enter your full name"
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
                      <div className="relative flex">
                        <select
                          value={countryCode}
                          onChange={(e) => {
                            setCountryCode(e.target.value);
                            setOtpError(null);
                          }}
                          className="px-2 py-2 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-700 font-mono text-xs font-bold focus:outline-none focus:bg-white cursor-pointer select-none shrink-0"
                          title="Select Country Calling Code"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={COUNTRY_CODES.find((c) => c.code === countryCode)?.maxDigits || 15}
                          required
                          value={phone}
                          onChange={(e) => {
                            const max = COUNTRY_CODES.find((c) => c.code === countryCode)?.maxDigits || 15;
                            const digits = e.target.value.replace(/\D/g, '').slice(0, max);
                            setPhone(digits);
                            setOtpError(null);
                          }}
                          placeholder={COUNTRY_CODES.find((c) => c.code === countryCode)?.samplePlaceholder || 'Phone number'}
                          className="w-full px-3 py-2.5 rounded-r-xl border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z\s.-]/g, '');
                            setCity(val);
                            setOtpError(null);
                          }}
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

                  {/* Target Exam Goal Dropdown + Other */}
                  <TargetExamSelector value={targetExam} onChange={setTargetExam} />
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

              {tab !== 'forgot_password' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

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
                    </button>{' '}
                    for using the Evalnium LIS practice platform and receiving academic updates.
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
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{tab === 'forgot_password' ? 'Verify Code & Set Password' : 'Verify Email & Complete Sign In'}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Step 3: Set New Password Screen (Forgot Password Flow) */}
        {step === 'new_password' && (
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Identity verified for <strong>{email}</strong>. Enter your new password below:</span>
            </div>

            {otpError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                {otpError}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
                {successMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Confirm New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save New Password &amp; Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
      <LegalPolicyModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
};
