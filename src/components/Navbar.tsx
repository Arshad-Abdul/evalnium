import React, { useState, useEffect } from 'react';
import { ShieldCheck, GraduationCap, Trophy, LogOut, LogIn, ChevronDown, Bookmark, User, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { EditProfileModal } from './auth/EditProfileModal';

interface NavbarProps {
  activeTab: 'user' | 'dashboard' | 'leaderboard' | 'admin';
  setActiveTab: (tab: 'user' | 'dashboard' | 'leaderboard' | 'admin') => void;
  isAdminAuthenticated: boolean;
  onAdminLogout: () => void;
  onCandidateLogout?: () => void;
  totalQuizzesCount: number;
  onOpenRevisionHub?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdminAuthenticated,
  onAdminLogout,
  onCandidateLogout,
  totalQuizzesCount,
  onOpenRevisionHub,
}) => {
  const { currentUser, logoutCandidate } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [clockString, setClockString] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      setClockString(`${timeStr} • ${dateStr}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const isAdminVisible =
    isAdminAuthenticated &&
    (!currentUser || currentUser.role === 'admin');

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Live Clock Ticker */}
          <div className="flex items-center space-x-4">
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => setActiveTab(currentUser ? 'dashboard' : 'user')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-all border border-indigo-400/30">
                E
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-sans">
                    EVALNIUM
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono uppercase tracking-widest">
                    PRO CBT
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">National Examination Engine</p>
              </div>
            </div>

            {/* Live System Clock Ticker 🕒 */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 font-mono text-[11px] font-bold text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{clockString || '02:15:00 PM'}</span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            {currentUser && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My Dashboard</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Exam Catalog ({totalQuizzesCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Live Ranks</span>
            </button>

            {isAdminVisible && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Studio</span>
              </button>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {onOpenRevisionHub && (
              <button
                onClick={onOpenRevisionHub}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all flex items-center space-x-1 text-xs font-bold"
                title="Bookmarked Questions Revision Hub"
              >
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Bookmarks</span>
              </button>
            )}

            {/* Candidate User Pill */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 p-1.5 pr-3 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-600 font-extrabold text-white text-xs flex items-center justify-center">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-bold text-white leading-none">{currentUser.name}</p>
                    <span className="text-[9px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
                      {currentUser.role === 'admin' && isAdminAuthenticated ? 'SYSTEM ADMIN' : 'CANDIDATE'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Profile Dropdown */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowEditProfileModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <User className="w-4 h-4 text-indigo-400" />
                      <span>Edit Candidate Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onAdminLogout();
                        logoutCandidate();
                        onCandidateLogout?.();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center space-x-1.5 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Student Sign In</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Auth & Profile Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
    </>
  );
};
