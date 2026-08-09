// Auto Translation Cache & Helper for Dual Language Exams

const translationCache: Record<string, string> = {};

export function cleanMojibakeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\uFFFD\u25FF\u25FE]/g, '"')
    .replace(/\uFFFD/g, '"');
}

export async function translateToHindi(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return '';
  const cleaned = cleanMojibakeText(text).trim();
  if (!cleaned) return '';

  // DO NOT translate short single letters, codes, numbers, or symbols (e.g. "E", "F", "G", "H", "123", "A)")
  if (cleaned.length <= 3 || (/^[A-Z0-9\s\.\,\(\)\-\:]+$/i.test(cleaned) && cleaned.length <= 6)) {
    return cleaned;
  }

  if (translationCache[cleaned]) return translationCache[cleaned];

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleaned.slice(0, 450))}&langpair=en|hi`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && translated.trim() !== '' && !translated.includes('RESPONSE STATUS: 403')) {
        const cleanedTrans = cleanMojibakeText(translated);
        translationCache[cleaned] = cleanedTrans;
        return cleanedTrans;
      }
    }
  } catch {
    // API fail fallback
  }

  return cleaned;
}
