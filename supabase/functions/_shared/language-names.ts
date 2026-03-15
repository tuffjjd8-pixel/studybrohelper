// Maps ISO codes to full display names for system prompt injection
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish (Español)",
  hi: "Hindi (हिन्दी)",
  ar: "Arabic (العربية)",
  zh: "Chinese (中文)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  ko: "Korean (한국어)",
  ja: "Japanese (日本語)",
  pt: "Portuguese (Português)",
  it: "Italian (Italiano)",
  tr: "Turkish (Türkçe)",
  bn: "Bengali (বাংলা)",
  ur: "Urdu (اردو)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  vi: "Vietnamese (Tiếng Việt)",
  ru: "Russian (Русский)",
  id: "Indonesian (Bahasa Indonesia)",
  ne: "Nepali (नेपाली)",
  th: "Thai (ภาษาไทย)",
  pl: "Polish (Polski)",
  nl: "Dutch (Nederlands)",
  uk: "Ukrainian (Українська)",
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}
