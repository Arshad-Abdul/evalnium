import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, Sparkles, X, CheckCircle, ShieldCheck } from 'lucide-react';

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (tab === 'register') {
      registerCandidate(name || 'Candidate', email);
      setSuccessMsg('Account registered successfully! Welcome to Evalnium.');
    } else {
      loginCandidate(email, name);
      setSuccessMsg('Successfully signed in!');
    }

    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xl space-y-6 animate-in fade-in duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Student Access Portal</h3>
              <p className="text-xs text-slate-500 font-medium">Join candidate network to track ranks & performance</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
            Create Candidate Account
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

        {successMsg ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Full Name</label>
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
              <Sparkles className="w-4 h-4" />
              <span>{tab === 'register' ? 'Complete Registration' : 'Sign In to Account'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
