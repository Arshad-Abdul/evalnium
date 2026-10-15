import React, { useState, useEffect } from 'react';
import { ShieldCheck, BookOpen, Trophy, LogOut, LogIn, ChevronDown, Bookmark, User, Clock, LayoutDashboard, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { EditProfileModal } from './auth/EditProfileModal';
import { EvalniumLogo } from './brand/EvalniumLogo';

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
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Institutional Brand Seal & System Clock */}
          <div className="flex items-center space-x-4">
            <div
              className="cursor-pointer select-none"
              onClick={() => setActiveTab(currentUser ? 'dashboard' : 'user')}
            >
              <EvalniumLogo size="sm" inverted={false} showSubtext={true} />
            </div>

            {/* Precision Tabular Examination Clock */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/80 font-mono text-[11px] text-slate-600 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{clockString || '00:00:00 • Standard Time'}</span>
            </div>
          </div>

          {/* Institutional Segmented Navigation Bar */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            {currentUser && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dashboard'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">Dashboard</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'user'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'user' ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden md:inline">Exam Catalog ({totalQuizzesCount})</span>
              <span className="sm:hidden">Exams ({totalQuizzesCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'leaderboard'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Rankings</span>
              {!currentUser && !isAdminAuthenticated && (
                <Lock className="w-3 h-3 text-amber-500 shrink-0" />
              )}
            </button>

            {isAdminVisible && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'admin'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin</span>
                <span className="hidden md:inline"> Studio</span>
              </button>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2">

            {onOpenRevisionHub && (
              <button
                onClick={onOpenRevisionHub}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors flex items-center space-x-1.5 text-xs font-semibold shadow-2xs"
                title="Bookmarked Questions Revision Hub"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Saved Questions</span>
              </button>
            )}

            {/* Candidate User Profile Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">{currentUser.name}</p>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
                      {currentUser.role === 'admin' && isAdminAuthenticated ? 'ADMINISTRATOR' : 'CANDIDATE'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 space-y-1">
                    <div className="px-2.5 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowEditProfileModal(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Candidate Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onAdminLogout();
                        logoutCandidate();
                        onCandidateLogout?.();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>{isAdminAuthenticated ? 'Sign Out & Lock Admin' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {isAdminAuthenticated && (
                  <button
                    onClick={onAdminLogout}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Lock Admin Studio and Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Exit Admin</span>
                    <span className="sm:hidden">Exit</span>
                  </button>
                )}

                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Candidate Sign In</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Authentication & Profile Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
    </>
  );
};
