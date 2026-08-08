/**
 * Bilingual Web Speech Synthesis Utility (English & Hindi Text-to-Speech)
 */

export function speakText(text: string, onEnd?: () => void): () => void {
  if (!('speechSynthesis' in window)) {
    alert('Audio Reader is not supported in your browser.');
    return () => {};
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip HTML / Markdown symbols
  const cleanText = text.replace(/[*#_~`]/g, '').trim();
  if (!cleanText) return () => {};

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.95; // Natural speaking pace
  utterance.pitch = 1;

  // Auto-detect Hindi vs English text
  const isHindi = /[\u0900-\u097F]/.test(cleanText);
  
  const voices = window.speechSynthesis.getVoices();
  if (isHindi) {
    utterance.lang = 'hi-IN';
    const hiVoice = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
    if (hiVoice) utterance.voice = hiVoice;
  } else {
    utterance.lang = 'en-US';
    const enVoice = voices.find(v => v.lang.includes('en') || v.name.toLowerCase().includes('english'));
    if (enVoice) utterance.voice = enVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);

  // Return cancel handle
  return () => {
    window.speechSynthesis.cancel();
  };
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
