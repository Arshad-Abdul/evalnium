import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, X, CheckCircle, ShieldCheck, KeyRound, RefreshCw, ArrowLeft, Loader2, Phone, MapPin, Briefcase, Building2, GraduationCap, AlertTriangle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { LegalPolicyModal, type LegalDocType } from '../common/LegalPolicyModal';
import { TargetExamSelector, DEFAULT_LIS_EXAM } from './TargetExamSelector';
import { COUNTRY_CODES } from '../../utils/countryCodes';

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  // Gmail typos
  'gma.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gimail.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gamail.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmailc.om': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmai.in': 'gmail.com',
  'gmail.in': 'gmail.com',
  'g.mail.com': 'gmail.com',
  'gmailcom': 'gmail.com',
  'gmial.co': 'gmail.com',
  'gma.co': 'gmail.com',
  'gmal.co': 'gmail.com',
  'gamil.co': 'gmail.com',

  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'ymail.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yaho.co.in': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yaho.co': 'yahoo.com',

  // Hotmail / Outlook typos
  'hotmial.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outluk.com': 'outlook.com',

  // Rediffmail typos
  'redifmail.com': 'rediffmail.com',
  'rediffmial.com': 'rediffmail.com',
  'redifmial.com': 'rediffmail.com',
};

const getEmailSuggestion = (emailStr: string): string | null => {
  if (!emailStr) return null;
  const clean = emailStr.trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  if (atIndex === -1) return null;
  const userPart = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex + 1);
  if (!domain || !userPart) return null;

  // 1. Direct dictionary match
  if (COMMON_DOMAIN_TYPOS[domain]) {
    return `${userPart}@${COMMON_DOMAIN_TYPOS[domain]}`;
  }

  // 2. Missing top-level domain e.g. "gmail", "gma", "yahoo"
  if (['gmail', 'gma', 'gmai', 'gamil', 'gmial', 'gmal'].includes(domain)) {
    return `${userPart}@gmail.com`;
  }
  if (['yahoo', 'yaho', 'ymail'].includes(domain)) {
    return `${userPart}@yahoo.com`;
  }
  if (['hotmail', 'hotmial'].includes(domain)) {
    return `${userPart}@hotmail.com`;
  }
  if (['outlook', 'outlok'].includes(domain)) {
    return `${userPart}@outlook.com`;
  }

  // 3. Typo TLD endings (.cmo, .con, .cpm, .comm -> .com)
  if (domain.endsWith('.cmo') || domain.endsWith('.con') || domain.endsWith('.cpm') || domain.endsWith('.comm')) {
    const base = domain.split('.')[0];
    const targetBase = COMMON_DOMAIN_TYPOS[`${base}.com`] || (base === 'gmail' || base.startsWith('gm') ? 'gmail.com' : `${base}.com`);
    return `${userPart}@${targetBase}`;
  }

  // 4. Fuzzy match for common gmail typos (starts with gm, ends with .com or .co, but not gmx)
  if (
    (domain.startsWith('gm') || domain.startsWith('g-m')) &&
    (domain.endsWith('.com') || domain.endsWith('.co')) &&
    domain !== 'gmail.com' &&
    domain !== 'gmx.com' &&
    domain !== 'gmx.net' &&
    domain.length <= 11
  ) {
    return `${userPart}@gmail.com`;
  }

  return null;
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'signin' | 'register' | 'forgot_password';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialTab = 'signin' }) => {
  const { registerCandidate, loginCandidate, resetPassword, checkCandidateExists } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register' | 'forgot_password'>(initialTab || 'signin');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

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

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab || 'signin');
      setStep('details');
      setOtpError(null);
      setSuccessMsg(null);
      setShowPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const cleanEmail = email.trim().toLowerCase();
    setEmail(cleanEmail);

    // Hard-block obvious typo domains so OTP is NEVER dispatched into void
    const typo = getEmailSuggestion(cleanEmail);
    if (typo) {
      setOtpError(`Your email domain "@${cleanEmail.split('@')[1]}" looks incorrect. Did you mean "${typo}"? Please click "Fix Email" below.`);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setOtpError('Please enter a valid email address with a valid domain (e.g. name@gmail.com).');
      return;
    }

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
      if (!password || password.length < 6) {
        setOtpError('Please choose a password with at least 6 characters.');
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
        body: JSON.stringify({ email: cleanEmail, name: name.trim() }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(30);
        setStep('otp_verify');
        if (data.deliveryWarning) {
          setOtpError(data.deliveryWarning);
        } else {
          setOtpError(null);
        }
      } else {
        const rawErr = data.error || 'Failed to send OTP to email.';
        const cleanErr = rawErr.includes('550-5.4.5') || rawErr.toLowerCase().includes('daily user sending limit')
          ? 'Automated email delivery reached server daily volume. Your verification code is safely generated! Please contact Admin (evalniumlis@gmail.com) to receive your code.'
          : rawErr;
        setOtpError(cleanErr);
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xl space-y-4 sm:space-y-5 animate-in fade-in duration-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
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
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
            onClick={() => {
              setStep('details');
              onClose();
            }}
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
                  onClick={() => {
                    setTab('signin');
                    setOtpError(null);
                  }}
                  className={`w-1/2 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    tab === 'signin'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setOtpError(null);
                  }}
                  className={`w-1/2 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    tab === 'register'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
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
                          <option value="Student">Student (General)</option>
                          <option value="BLIS Student">BLIS Student</option>
                          <option value="MLIS Student">MLIS Student</option>
                          <option value="Research Scholar">Research Scholar</option>
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
                    onChange={(e) => {
                      setEmail(e.target.value.toLowerCase().replace(/\s+/g, ''));
                      setOtpError(null);
                    }}
                    onBlur={() => {
                      setEmail((prev) => prev.toLowerCase().trim());
                    }}
                    placeholder="name@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 lowercase"
                  />
                </div>
                {getEmailSuggestion(email) && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="truncate">
                        Did you mean <strong className="font-bold text-amber-950 underline">{getEmailSuggestion(email)}</strong>?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const suggestion = getEmailSuggestion(email);
                        if (suggestion) {
                          setEmail(suggestion);
                          setOtpError(null);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer shrink-0 transition-colors shadow-2xs"
                    >
                      Fix Email
                    </button>
                  </div>
                )}
              </div>

              {tab !== 'forgot_password' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer select-none"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={tab === 'register' ? 'Create a secure password (min 6 characters)' : 'Enter your account password'}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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

              {/* Form Navigation / Quick Switcher */}
              {tab === 'signin' && (
                <div className="pt-3 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-600">
                    Don't have an Evalnium account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register');
                        setOtpError(null);
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer ml-1"
                    >
                      Create Candidate Account
                    </button>
                  </p>
                </div>
              )}

              {tab === 'register' && (
                <div className="pt-3 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-600">
                    Already registered with Evalnium?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTab('signin');
                        setOtpError(null);
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer ml-1"
                    >
                      Sign In to Account
                    </button>
                  </p>
                </div>
              )}
            </form>
          </>
        )}

        {/* Step 2: 6-Digit OTP Verification Screen */}
        {step === 'otp_verify' && (
          <div className="space-y-4">
            {/* Email Sent Callout Banner */}
            <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-indigo-950">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Verification OTP Sent!</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                We sent a 6-digit verification code to <strong className="font-mono text-indigo-950 font-bold">{email.trim().toLowerCase()}</strong>. Enter the code below to verify your account:
              </p>
            </div>

            {/* Prominent English Spam / Promotions Guidance Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950 text-xs">
                    Can't find the email in your Inbox?
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Automated security codes often arrive in your <strong>Spam / Junk folder</strong> or the <strong>Promotions / Updates tab</strong>. Please check there before requesting a new code.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {email.toLowerCase().includes('gmail') && (
                  <>
                    <a
                      href="https://mail.google.com/mail/u/0/#spam"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-[11px] transition-colors border border-amber-300/70 cursor-pointer"
                    >
                      <span>Open Gmail Spam Folder</span>
                      <ExternalLink className="w-3 h-3 text-amber-700" />
                    </a>
                    <a
                      href="https://mail.google.com/mail/u/0/#inbox"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-semibold text-[11px] transition-colors border border-slate-200 cursor-pointer"
                    >
                      <span>Open Gmail Inbox</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </>
                )}
                {email.toLowerCase().includes('yahoo') && (
                  <a
                    href="https://mail.yahoo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-[11px] transition-colors border border-amber-300/70 cursor-pointer"
                  >
                    <span>Open Yahoo Mail</span>
                    <ExternalLink className="w-3 h-3 text-amber-700" />
                  </a>
                )}
                {(email.toLowerCase().includes('outlook') || email.toLowerCase().includes('hotmail')) && (
                  <a
                    href="https://outlook.live.com/mail/0/junkemail"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-[11px] transition-colors border border-amber-300/70 cursor-pointer"
                  >
                    <span>Open Outlook Junk Folder</span>
                    <ExternalLink className="w-3 h-3 text-amber-700" />
                  </a>
                )}
              </div>
            </div>

            {successMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
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

                {/* Support Help Contact - Email Only */}
                <div className="pt-2 border-t border-slate-100 text-center">
                  <p className="text-[11px] text-slate-500">
                    Still haven't received your verification email?{' '}
                    <a
                      href={`mailto:evalniumlis@gmail.com?subject=${encodeURIComponent('Assistance Required: OTP Verification for ' + email)}&body=${encodeURIComponent('Hello Evalnium Support,\n\nI am unable to receive the verification OTP on my email address: ' + email + '.\n\nPlease provide my verification code or assist with account activation.\n\nThank you.')}`}
                      className="font-semibold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3 inline" />
                      Contact Admin via Email
                    </a>
                  </p>
                </div>
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">New Password</label>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer select-none"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Confirm New Password</label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer select-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
