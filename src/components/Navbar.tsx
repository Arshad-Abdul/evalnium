import React, { useState } from 'react';
import { ShieldCheck, GraduationCap, Trophy, Lock, LogOut, Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';

interface NavbarProps {
  activeTab: 'user' | 'leaderboard' | 'admin';
  setActiveTab: (tab: 'user' | 'leaderboard' | 'admin') => void;
  isAdminAuthenticated: boolean;
  onAdminLogout: () => void;
  totalQuizzesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdminAuthenticated,
  onAdminLogout,
  totalQuizzesCount,
}) => {
  const { currentUser, logoutCandidate } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('user')}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 text-white font-black text-lg">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                  Evalnium
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  CBT Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Global Assessment & Smart MCQ Converter</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            
            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                activeTab === 'user'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span className="hidden md:inline">Exam Portal</span>
              <span className="ml-1 px-1.5 py-0.2 text-[11px] bg-indigo-50 text-indigo-700 rounded-md font-mono font-bold">
                {totalQuizzesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-amber-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>Leaderboard</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-50 text-amber-800 rounded font-bold">
                Ranks
              </span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                activeTab === 'admin'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">Admin Studio</span>
              {isAdminAuthenticated ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Unlocked
                </span>
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-semibold flex items-center">
                  <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
                </span>
              )}
            </button>

          </div>

          {/* User Profile / Candidate Auth Status */}
          <div className="flex items-center space-x-2 relative">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate hidden sm:inline">
                    {currentUser.name}
                  </span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 space-y-1">
                    <div className="p-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        logoutCandidate();
                        setShowUserDropdown(false);
                      }}
                      className="w-full p-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Student Sign In</span>
              </button>
            )}

            {isAdminAuthenticated && (
              <button
                onClick={onAdminLogout}
                className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-all font-bold"
                title="Lock Admin Studio"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock Admin</span>
              </button>
            )}
          </div>

        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
