import type { LeaderboardEntry } from '../types/auth';

/**
 * CSV / Excel Export Utility for Leaderboards and Student Marksheets
 */
export function exportLeaderboardToCSV(entries: LeaderboardEntry[], filename = 'evalnium_leaderboard_ranks.csv'): void {
  if (!entries || entries.length === 0) {
    alert('No rank logs available to export.');
    return;
  }

  const headers = ['Rank', 'Candidate Name', 'Exam Title', 'Topic', 'Score', 'Max Score', 'Percentage', 'Time Spent (Seconds)', 'Attempt Date'];
  
  const rows = entries.map((e, idx) => [
    idx + 1,
    `"${(e.candidateName || '').replace(/"/g, '""')}"`,
    `"${(e.quizTitle || '').replace(/"/g, '""')}"`,
    `"${(e.topic || '').replace(/"/g, '""')}"`,
    e.score,
    e.maxScore,
    `${e.percentage}%`,
    e.timeSpentSeconds,
    `"${new Date(e.attemptedAt).toLocaleString()}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
