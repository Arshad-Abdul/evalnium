import React from 'react';
import { extractStatementsStructure } from '../../utils/parsers';

interface FormattedQuestionStemProps {
  text: string;
  className?: string;
  leadClassName?: string;
  statementClassName?: string;
  closingClassName?: string;
}

export const FormattedQuestionStem: React.FC<FormattedQuestionStemProps> = ({
  text,
  className = '',
  leadClassName = '',
  statementClassName = '',
  closingClassName = '',
}) => {
  if (!text) return null;

  const struct = extractStatementsStructure(text);

  // If no multi-statement structure is detected, fallback to standard pre-line text
  if (!struct || struct.items.length === 0) {
    return <div className={`whitespace-pre-line ${className}`}>{text}</div>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Primary Question Lead / Prompt */}
      {struct.lead && (
        <div className={leadClassName || 'font-semibold text-slate-900 leading-relaxed'}>
          {struct.lead}
        </div>
      )}

      {/* 2. Structured Premise / Statement Cards */}
      <div className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-2 shadow-2xs ${statementClassName}`}>
        {struct.items.map((item, idx) => {
          const isShortLabel = item.label.length <= 3;
          return (
            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-slate-800">
              {isShortLabel ? (
                <span className="inline-flex items-center justify-center min-w-[1.65rem] h-6 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold text-xs select-none shrink-0 mt-0.5">
                  {item.label}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-200/80 border border-slate-300 text-slate-800 font-bold text-xs select-none shrink-0 mt-0.5 font-mono">
                  {item.label}
                </span>
              )}
              <span className="flex-1 leading-relaxed text-slate-800 font-normal">
                {item.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. Closing Directive (e.g., "Choose the correct answer from the options given below:") */}
      {struct.closing && (
        <div className={closingClassName || 'pt-1 text-xs sm:text-sm font-semibold text-slate-700 italic flex items-center gap-1.5'}>
          <span className="inline-block text-indigo-600 font-bold font-sans not-italic">▶</span>
          <span>{struct.closing}</span>
        </div>
      )}
    </div>
  );
};

