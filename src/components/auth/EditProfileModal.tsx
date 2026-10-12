import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, X, CheckCircle, Target, Building, Phone } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useAuth();

  const [name, setName] = useState(currentUser?.name || '');
  const [targetExam, setTargetExam] = useState(currentUser?.targetExam || 'UGC NET / LIS');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [institution, setInstitution] = useState(currentUser?.institution || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: name.trim() || currentUser.name,
      targetExam: targetExam.trim(),
      phone: phone.trim(),
      institution: institution.trim(),
    });

    setSuccessMsg('Profile updated successfully!');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Edit Student Profile</h3>
              <p className="text-xs text-slate-500 font-medium">Update your candidate credentials & exam goal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Candidate Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address (Read-Only)</label>
            <input
              type="email"
              disabled
              value={currentUser.email}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-100 font-mono text-slate-500 font-semibold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>Target Exam Goal</span>
            </label>
            <input
              type="text"
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value)}
              placeholder="e.g. UGC NET LIS / KVS / State SET"
              className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-amber-600" />
              <span>College / University / Institution</span>
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Delhi University / BHU"
              className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mobile Phone Number (Optional)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center space-x-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
            >
              Save Profile
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
