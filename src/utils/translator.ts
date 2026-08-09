// Auto Translation Cache & Helper for Dual Language Exams

const translationCache: Record<string, string> = {};

export async function translateToHindi(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (translationCache[trimmed]) return translationCache[trimmed];

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 450))}&langpair=en|hi`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && translated.trim() !== '') {
        translationCache[trimmed] = translated;
        return translated;
      }
    }
  } catch {
    // API fail fallback
  }

  return text;
}
