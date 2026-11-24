import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  X,
  CheckCircle,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Camera,
} from 'lucide-react';
import { TargetExamSelector, normalizeLegacyExamGoal } from './TargetExamSelector';
import { COUNTRY_CODES, parseStoredPhone } from '../../utils/countryCodes';

export const PRESET_AVATARS = [
  { id: 'avatar-1', label: 'Male Scholar', emoji: '👨‍🎓', svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%232563eb"/><stop offset="100%" stop-color="%231d4ed8"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g1)"/><text x="50" y="65" font-size="52" text-anchor="middle" font-family="sans-serif">👨‍🎓</text></svg>' },
  { id: 'avatar-2', label: 'Female Scholar', emoji: '👩‍🎓', svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%237c3aed"/><stop offset="100%" stop-color="%236d28d9"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g2)"/><text x="50" y="65" font-size="52" text-anchor="middle" font-family="sans-serif">👩‍🎓</text></svg>' },
  { id: 'avatar-3', label: 'Librarian Professional', emoji: '🧑‍🏫', svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23059669"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g3)"/><text x="50" y="65" font-size="52" text-anchor="middle" font-family="sans-serif">🧑‍🏫</text></svg>' },
  { id: 'avatar-4', label: 'Research Scholar', emoji: '🔬', svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%230891b2"/><stop offset="100%" stop-color="%230e7490"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g4)"/><text x="50" y="65" font-size="52" text-anchor="middle" font-family="sans-serif">🔬</text></svg>' },
  { id: 'avatar-5', label: 'Exam Aspirant', emoji: '🎯', svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23d97706"/><stop offset="100%" stop-color="%23b45309"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g5)"/><text x="50" y="65" font-size="52" text-anchor="middle" font-family="sans-serif">🎯</text></svg>' },
  { id: 'avatar-6', label: 'Book Specialist', emoji: '📚', svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23e11d48"/><stop offset="100%" stop-color="%23be123c"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g6)"/><text x="50" y="65" font-size="52" text-anchor="middle" font-family="sans-serif">📚</text></svg>' },
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useAuth();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [occupationStatus, setOccupationStatus] = useState('Student');
  const [designation, setDesignation] = useState('');
  const [universityInstitute, setUniversityInstitute] = useState('');
  const [targetExam, setTargetExam] = useState(() => normalizeLegacyExamGoal());

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync form fields from currentUser whenever the modal opens or currentUser loads/updates
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setName(currentUser.name || '');
    setAvatarUrl(currentUser.avatarUrl || null);
    const parsed = parseStoredPhone(currentUser.phone);
    setCountryCode(parsed.countryCode);
    setPhone(parsed.digits);
    setCity(currentUser.city || '');
    setGender(currentUser.gender || 'Prefer not to say');
    setOccupationStatus(currentUser.occupationStatus || 'Student');
    setDesignation(currentUser.designation || '');
    setUniversityInstitute(currentUser.universityInstitute || currentUser.institution || '');
    setTargetExam(normalizeLegacyExamGoal(currentUser.targetExam));
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg('Image file size must be under 12MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const TARGET_SIZE = 160;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Center-crop to a clean 1:1 square profile picture
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setAvatarUrl(compressed);
          setErrorMsg(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 3) {
      setErrorMsg('Full legal candidate name must be at least 3 characters.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
    if (countryCode === '+91') {
      if (cleanPhone.length !== 10) {
        setErrorMsg('Mobile number must be strictly 10 digits.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        setErrorMsg('Mobile number must be a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.');
        return;
      }
    } else {
      if (cleanPhone.length < 7 || cleanPhone.length > selectedCountry.maxDigits) {
        setErrorMsg(`Mobile number for ${selectedCountry.name} must be between 7 and ${selectedCountry.maxDigits} digits.`);
        return;
      }
    }
    if (!city.trim() || city.trim().length < 2) {
      setErrorMsg('Valid City of Residence is required.');
      return;
    }
    if (!targetExam.trim()) {
      setErrorMsg('Please specify your Target Exam Goal.');
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile({
        name: cleanName,
        phone: `${countryCode} ${cleanPhone}`,
        city: city.trim(),
        gender,
        occupationStatus,
        designation: designation.trim(),
        universityInstitute: universityInstitute.trim(),
        institution: universityInstitute.trim(),
        targetExam: targetExam.trim(),
        avatarUrl: avatarUrl || undefined,
      });

      setSuccessMsg('Profile saved and synced to your account!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4 sm:space-y-5 my-auto">
        <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">Edit Student Profile</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">Update your candidate details &amp; exam goal</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Candidate Avatar & Photo Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Candidate Avatar"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center border-2 border-white shadow-sm">
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block">
                  Candidate Photograph / Avatar (Optional)
                </span>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Upload a passport-sized photo or pick a student avatar for your CBT test screen.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer ml-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preset Avatars Row */}
            <div className="pt-1 border-t border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Or choose an avatar:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarUrl(av.svg)}
                    className={`relative p-0.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                      avatarUrl === av.svg
                        ? 'ring-2 ring-blue-600 bg-white shadow-xs scale-105'
                        : 'hover:bg-white hover:shadow-2xs opacity-80 hover:opacity-100'
                    }`}
                    title={av.label}
                  >
                    <img src={av.svg} alt={av.label} className="w-8 h-8 rounded-lg" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Full Candidate Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex">
                <select
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value);
                    setErrorMsg(null);
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
                    setErrorMsg(null);
                  }}
                  placeholder={COUNTRY_CODES.find((c) => c.code === countryCode)?.samplePlaceholder || 'Phone number'}
                  className="w-full px-3 py-2.5 rounded-r-xl border border-slate-200 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                City of Residence <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Hyderabad, Delhi"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Candidate Category</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={occupationStatus}
                  onChange={(e) => setOccupationStatus(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white focus:outline-none focus:border-blue-600"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Designation</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Scholar, Student"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">University / College</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={universityInstitute}
                  onChange={(e) => setUniversityInstitute(e.target.value)}
                  placeholder="e.g. IITH, DU, JNU"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <TargetExamSelector value={targetExam} onChange={setTargetExam} />

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address (Read-Only)</label>
            <input
              type="email"
              disabled
              value={currentUser.email}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-500 font-semibold cursor-not-allowed"
            />
          </div>

          <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
