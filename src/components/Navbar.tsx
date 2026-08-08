import React, { useState } from 'react';
import { ShieldCheck, GraduationCap, Trophy, LogOut, LogIn, ChevronDown, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';

interface NavbarProps {
  activeTab: 'user' | 'leaderboard' | 'admin';
  setActiveTab: (tab: 'user' | 'leaderboard' | 'admin') => void;
  isAdminAuthenticated: boolean;
  onAdminLogout: () => void;
  totalQuizzesCount: number;
  onOpenRevisionHub?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdminAuthenticated,
  onAdminLogout,
  totalQuizzesCount,
  onOpenRevisionHub,
}) => {
  const { currentUser, logoutCandidate } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const isAdminVisible =
    isAdminAuthenticated ||
    Boolean(currentUser && (currentUser.role === 'admin' || currentUser.email.toLowerCase().includes('admin')));

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('user')}>
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-base shadow-sm group-hover:bg-blue-600 transition-colors">
              E
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 font-sans">
                  EVALNIUM
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono uppercase tracking-wider">
                  CBT Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Computer Based Testing System</p>
            </div>
          </div>

          {/* Center Navigation Segment */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'user'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Exam Portal</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono font-bold">
                {totalQuizzesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Leaderboard</span>
            </button>

            {isAdminVisible && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Admin Studio</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded font-mono uppercase font-bold">
                  Unlocked
                </span>
              </button>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2">
            {onOpenRevisionHub && (
              <button
                onClick={onOpenRevisionHub}
                className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all flex items-center space-x-1.5"
                title="Open Saved Bookmarked Questions"
              >
                <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span className="hidden md:inline">Revision Hub</span>
              </button>
            )}

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-all shadow-xs"
                >
                  <div className="w-5 h-5 rounded bg-blue-600 text-white text-[11px] font-mono flex items-center justify-center">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[110px] truncate">{currentUser.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg p-2 z-50 space-y-1">
                    <div className="p-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser.email}</p>
                    </div>

                    {onOpenRevisionHub && (
                      <button
                        onClick={() => {
                          onOpenRevisionHub();
                          setShowUserDropdown(false);
                        }}
                        className="w-full p-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center space-x-2"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                        <span>My Bookmarked Questions</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        logoutCandidate();
                        setShowUserDropdown(false);
                      }}
                      className="w-full p-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out Account</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Student Sign In</span>
              </button>
            )}

            {isAdminAuthenticated && (
              <button
                onClick={onAdminLogout}
                className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-all font-semibold"
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
