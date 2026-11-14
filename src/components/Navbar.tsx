import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Trophy,
  LogOut,
  LogIn,
  ChevronDown,
  Bookmark,
  User,
  Clock,
  LayoutDashboard,
  Lock,
  Menu,
  X,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { EditProfileModal } from './auth/EditProfileModal';
import { AboutModal } from './common/AboutModal';
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
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [clockString, setClockString] = useState<string>('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      setClockString(`${dateStr} · ${timeStr}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  // Close user dropdown on outside click or Escape key
  useEffect(() => {
    if (!showUserDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showUserDropdown]);

  // Body scroll lock, Escape close, and viewport resize auto-close for slide-over drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileMenuOpen]);

  const isAdminVisible =
    isAdminAuthenticated &&
    (!currentUser || currentUser.role === 'admin');

  const navigateTo = (tab: 'user' | 'dashboard' | 'leaderboard' | 'admin') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleSignOutAll = () => {
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
    onAdminLogout();
    logoutCandidate();
    onCandidateLogout?.();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 text-slate-900">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Left: Brand + Desktop Navigation Links */}
          <div className="flex items-center gap-6 lg:gap-8 min-w-0">
            <button
              type="button"
              onClick={() => navigateTo(currentUser ? 'dashboard' : 'user')}
              className="text-left focus:outline-none cursor-pointer shrink-0"
              aria-label="Go to Evalnium home"
            >
              <EvalniumLogo size="sm" showSubtext={true} />
            </button>

            {/* Desktop Primary Navigation (1024px+ only — prevents tablet/scaled laptop crowding) */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              <button
                type="button"
                onClick={() => navigateTo('user')}
                className={`px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'user'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen className={`w-4 h-4 ${activeTab === 'user' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>Exams</span>
                <span className="ml-0.5 text-[11px] font-mono font-semibold text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded-md">
                  {totalQuizzesCount}
                </span>
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => navigateTo('dashboard')}
                  className={`px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeTab === 'dashboard'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Dashboard</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigateTo('leaderboard')}
                className={`px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'leaderboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Rankings</span>
                {!currentUser && !isAdminAuthenticated && (
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                className="px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                title="About Evalnium Portal & Features"
              >
                <Info className="w-4 h-4 text-indigo-500" />
                <span>About</span>
              </button>

              {isAdminVisible && (
                <button
                  type="button"
                  onClick={() => navigateTo('admin')}
                  className={`px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                      : 'text-emerald-700 hover:bg-emerald-50/70'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Admin Studio</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right: Utility Controls, Account Menu, Mobile Drawer Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Subtle System Time (Wide Desktop 1280px+ only) */}
            {clockString && (
              <div className="hidden xl:flex items-center gap-1.5 pr-2 mr-1 border-r border-slate-200 text-xs text-slate-500 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{clockString}</span>
              </div>
            )}

            {/* Saved Bookmarks (Desktop) */}
            {onOpenRevisionHub && (
              <button
                type="button"
                onClick={onOpenRevisionHub}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Saved Questions & Bookmarks"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden xl:inline">Saved</span>
              </button>
            )}

            {/* Desktop Exit Admin shortcut when logged in purely as Admin */}
            {!currentUser && isAdminAuthenticated && (
              <button
                type="button"
                onClick={onAdminLogout}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Lock Admin Studio"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Admin</span>
              </button>
            )}

            {/* Account Dropdown or Sign In CTA */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown((prev) => !prev)}
                  className="flex items-center gap-2 p-1 pr-2 sm:pr-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  aria-expanded={showUserDropdown}
                  aria-haspopup="menu"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left max-w-[120px]">
                    <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                      {currentUser.name}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {showUserDropdown && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50"
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                    </div>

                    <div className="p-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowEditProfileModal(true);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Profile</span>
                      </button>

                      {onOpenRevisionHub && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenRevisionHub();
                          }}
                          className="w-full lg:hidden px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                          <span>Saved Questions</span>
                        </button>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOutAll}
                        className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{isAdminAuthenticated ? 'Sign Out & Lock Admin' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile & Tablet Drawer Toggle (< 1024px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-Over Navigation Drawer (320px Phones through 1023px Tablets) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {/* Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Right Slide-Over Panel */}
          <div className="relative z-10 w-[85vw] max-w-[320px] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <EvalniumLogo size="sm" showSubtext={false} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-1">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Navigation
                </p>

                <button
                  type="button"
                  onClick={() => navigateTo('user')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    activeTab === 'user'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className={`w-4 h-4 ${activeTab === 'user' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Exams</span>
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {totalQuizzesCount}
                  </span>
                </button>

                {currentUser && (
                  <button
                    type="button"
                    onClick={() => navigateTo('dashboard')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>Dashboard</span>
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigateTo('leaderboard')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>Rankings</span>
                  </span>
                  {!currentUser && !isAdminAuthenticated && (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowAboutModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-indigo-500" />
                    <span>About Evalnium</span>
                  </span>
                </button>

                {onOpenRevisionHub && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenRevisionHub();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Bookmark className="w-4 h-4 text-amber-500" />
                      <span>Saved Questions</span>
                    </span>
                  </button>
                )}

                {isAdminVisible && (
                  <button
                    type="button"
                    onClick={() => navigateTo('admin')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Admin Studio</span>
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Sticky Drawer Footer: Account & System Time */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
              {currentUser ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowEditProfileModal(true);
                      }}
                      className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOutAll}
                      className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {isAdminAuthenticated && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onAdminLogout();
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Exit Admin Studio</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In / Register</span>
                  </button>
                </div>
              )}

              {clockString && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500 tabular-nums">
                  <span>Local Time</span>
                  <span>{clockString}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Authentication, Profile & About Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </>
  );
};
