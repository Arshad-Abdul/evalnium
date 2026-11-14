import React from 'react';
import { Compass, BookOpen, Home, ArrowLeft } from 'lucide-react';
import { EvalniumLogo } from '../brand/EvalniumLogo';

interface NotFoundViewProps {
  onGoHome: () => void;
  onGoCatalog: () => void;
  customMessage?: string;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onGoHome,
  onGoCatalog,
  customMessage
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-center">
          <EvalniumLogo size="lg" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>ERROR 404 · PAGE NOT FOUND</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Assessment Not Found
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
            {customMessage || "The mock exam, topic, or assessment link you requested has been moved, unpublished, or does not exist."}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoCatalog}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Browse Mock Tests</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span>Go to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

