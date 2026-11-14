export interface CountryCodeItem {
  code: string;
  country: string;
  name: string;
  flag: string;
  samplePlaceholder: string;
  maxDigits: number;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { code: '+91', country: 'IN', name: 'India', flag: '🇮🇳', samplePlaceholder: '9876543210', maxDigits: 10 },
  { code: '+977', country: 'NP', name: 'Nepal', flag: '🇳🇵', samplePlaceholder: '9812345678', maxDigits: 10 },
  { code: '+880', country: 'BD', name: 'Bangladesh', flag: '🇧🇩', samplePlaceholder: '1712345678', maxDigits: 10 },
  { code: '+94', country: 'LK', name: 'Sri Lanka', flag: '🇱🇰', samplePlaceholder: '712345678', maxDigits: 9 },
  { code: '+971', country: 'AE', name: 'UAE', flag: '🇦🇪', samplePlaceholder: '501234567', maxDigits: 9 },
  { code: '+966', country: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', samplePlaceholder: '501234567', maxDigits: 9 },
  { code: '+44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧', samplePlaceholder: '7911123456', maxDigits: 10 },
  { code: '+1', country: 'US', name: 'USA / Canada', flag: '🇺🇸', samplePlaceholder: '2025550143', maxDigits: 10 },
  { code: '+968', country: 'OM', name: 'Oman', flag: '🇴🇲', samplePlaceholder: '91234567', maxDigits: 8 },
  { code: '+965', country: 'KW', name: 'Kuwait', flag: '🇰🇼', samplePlaceholder: '91234567', maxDigits: 8 },
  { code: '+974', country: 'QA', name: 'Qatar', flag: '🇶🇦', samplePlaceholder: '33123456', maxDigits: 8 },
  { code: '+60', country: 'MY', name: 'Malaysia', flag: '🇲🇾', samplePlaceholder: '123456789', maxDigits: 10 },
  { code: '+65', country: 'SG', name: 'Singapore', flag: '🇸🇬', samplePlaceholder: '81234567', maxDigits: 8 },
  { code: '+92', country: 'PK', name: 'Pakistan', flag: '🇵🇰', samplePlaceholder: '3001234567', maxDigits: 10 },
  { code: '+', country: 'OTHER', name: 'Other Country', flag: '🌐', samplePlaceholder: '1234567890', maxDigits: 15 },
];

export function parseStoredPhone(rawPhone?: string | null): { countryCode: string; digits: string } {
  if (!rawPhone || !rawPhone.trim()) {
    return { countryCode: '+91', digits: '' };
  }
  const trimmed = rawPhone.trim();

  // Try matching known prefix
  for (const item of COUNTRY_CODES) {
    if (item.code !== '+' && trimmed.startsWith(item.code)) {
      const remainingDigits = trimmed.slice(item.code.length).replace(/\D/g, '');
      return { countryCode: item.code, digits: remainingDigits.slice(0, item.maxDigits) };
    }
  }

  // Generic plus prefix (e.g. +33 ...)
  if (trimmed.startsWith('+')) {
    const match = trimmed.match(/^(\+\d{1,4})\s*(\d+)$/);
    if (match) {
      return { countryCode: match[1], digits: match[2].slice(0, 15) };
    }
  }

  // Default fallback: 10-digit number
  const onlyDigits = trimmed.replace(/\D/g, '');
  return { countryCode: '+91', digits: onlyDigits.slice(0, 10) };
}

