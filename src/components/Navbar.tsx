import React from 'react';
import { ShieldCheck, GraduationCap, RefreshCw, Lock, LogOut, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'user' | 'admin';
  setActiveTab: (tab: 'user' | 'admin') => void;
  isAdminAuthenticated: boolean;
  onAdminLogout: () => void;
  totalQuizzesCount: number;
  onResetData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdminAuthenticated,
  onAdminLogout,
  totalQuizzesCount,
  onResetData,
}) => {
  return (
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
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
              activeTab === 'user'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Candidate Exam Portal</span>
            <span className="ml-1 px-1.5 py-0.2 text-[11px] bg-indigo-50 text-indigo-700 rounded-md font-mono font-bold">
              {totalQuizzesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
              activeTab === 'admin'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Admin Studio</span>
            {isAdminAuthenticated ? (
              <span className="flex items-center text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                🔓 Access Granted
              </span>
            ) : (
              <span className="flex items-center text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                <Lock className="w-2.5 h-2.5 mr-1" /> Protected
              </span>
            )}
          </button>
        </div>

        {/* Right Admin Controls */}
        <div className="flex items-center space-x-2">
          {isAdminAuthenticated && (
            <button
              onClick={onAdminLogout}
              className="flex items-center space-x-1.5 text-xs text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-all font-semibold"
              title="Lock Admin Studio"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock Admin</span>
            </button>
          )}

          {onResetData && (
            <button
              onClick={onResetData}
              title="Reset to default seed quizzes"
              className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Data</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
