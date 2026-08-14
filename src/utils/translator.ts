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
  if (cleaned.length <= 2 || (/^[A-D0-9\s\.\,\(\)\-\:]+$/i.test(cleaned) && cleaned.length <= 4)) {
    return cleaned;
  }

  if (translationCache[cleaned]) return translationCache[cleaned];

  // Try Google Translate public endpoint first (high quality, fast, reliable)
  try {
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(cleaned)}`;
    const gRes = await fetch(gUrl);
    if (gRes.ok) {
      const gData = await gRes.json();
      if (Array.isArray(gData) && Array.isArray(gData[0])) {
        const fullTranslation = gData[0].map((item: any) => item[0]).filter(Boolean).join('');
        if (fullTranslation && fullTranslation.trim()) {
          const res = cleanMojibakeText(fullTranslation.trim());
          translationCache[cleaned] = res;
          return res;
        }
      }
    }
  } catch {
    // Fallback to MyMemory
  }

  // Fallback to MyMemory
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

