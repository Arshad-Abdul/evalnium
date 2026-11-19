import React from 'react';
import type { Quiz } from '../../types/quiz';
import { resolveSmartBadge } from '../../utils/badgeHelper';

interface SmartQuizBadgeProps {
  quiz?: Partial<Quiz> | null;
  compact?: boolean;
  className?: string;
}

/**
 * Institutional Smart Badge for Quizzes.
 * Renders non-AI authentic badge with subtle hairline border, crisp monospace typography,
 * and automatic expiry support.
 */
export const SmartQuizBadge: React.FC<SmartQuizBadgeProps> = ({
  quiz,
  compact = false,
  className = '',
}) => {
  const badge = resolveSmartBadge(quiz);
  if (!badge) return null;

  return (
    <span
      className={`inline-flex items-center font-mono font-bold tracking-wider uppercase border select-none transition-colors shadow-2xs ${
        compact ? 'text-[10px] px-1.5 py-0.2 rounded' : 'text-[10.5px] px-2 py-0.5 rounded-md'
      } ${badge.colorClass} ${className}`}
      title={badge.isAutoDetected ? `Auto-categorized: ${badge.text}` : `Badge: ${badge.text}`}
    >
      {badge.text}
    </span>
  );
};
