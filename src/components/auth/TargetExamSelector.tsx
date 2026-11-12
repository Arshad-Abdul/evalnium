import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';

export const LIS_INDIA_EXAMS: readonly string[] = [
  'UGC NET / JRF (LIS)',
  'CUET UG / PG (LIS)',
  'State SET / SLET (LIS)',
  'KVS Librarian',
  'NVS Librarian',
  'DSSSB Librarian',
  'EMRS Librarian',
  'RRB Librarian',
  'RSMSSB / RSSB Librarian',
  'BPSC / Bihar Librarian',
  'UPPSC / UPSSSC Librarian',
  'MPPSC / MPESB Librarian',
  'OPSC / OSSSC Librarian',
  'WBPSC / WBSSC Librarian',
  'JKSSB Librarian',
  'HSSC / Haryana Librarian',
  'TNPSC / TRB Librarian',
  'KPSC / Kerala PSC Librarian',
  'ISRO / DRDO / BARC Library & Documentation',
  'IIT / IIM / AIIMS / Central University Librarian',
  'BLIS / MLIS University Entrance & Semester Prep',
];

export const DEFAULT_LIS_EXAM = LIS_INDIA_EXAMS[0];
const OTHER_EXAM_VALUE = '__OTHER__';

export function normalizeLegacyExamGoal(value?: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed === 'UGC NET / LIS') {
    return DEFAULT_LIS_EXAM;
  }
  return trimmed;
}

interface TargetExamSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const TargetExamSelector: React.FC<TargetExamSelectorProps> = ({
  value,
  onChange,
  label = 'Target Exam Goal',
}) => {
  const isPreset = LIS_INDIA_EXAMS.includes(value);
  const [useOther, setUseOther] = useState<boolean>(() => Boolean(value.trim()) && !isPreset);

  useEffect(() => {
    if (LIS_INDIA_EXAMS.includes(value)) {
      setUseOther(false);
    } else if (value.trim()) {
      setUseOther(true);
    }
  }, [value]);

  const selectValue = useOther ? OTHER_EXAM_VALUE : isPreset ? value : DEFAULT_LIS_EXAM;

  const handleSelectChange = (next: string) => {
    if (next === OTHER_EXAM_VALUE) {
      setUseOther(true);
      if (isPreset || !value.trim()) {
        onChange('');
      }
      return;
    }
    setUseOther(false);
    onChange(next);
  };

  return (
    <div className="space-y-1.5 text-xs">
      <label className="block font-bold text-slate-700 flex items-center space-x-1">
        <Target className="w-3.5 h-3.5 text-blue-600" />
        <span>{label}</span>
      </label>

      <select
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      >
        {LIS_INDIA_EXAMS.map((exam) => (
          <option key={exam} value={exam}>
            {exam}
          </option>
        ))}
        <option value={OTHER_EXAM_VALUE}>Other (Mention Exam Name)</option>
      </select>

      {useOther && (
        <input
          type="text"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your LIS / Librarian exam name (e.g. APPSC, GPSC, University Exam)..."
          className="w-full px-3 py-2.5 rounded-xl border border-blue-300 bg-blue-50/30 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      )}
    </div>
  );
};

