export const SUPPORTED_LANGUAGES = ["en", "tr"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  tr: "Türkçe",
};

export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: "en-US",
  tr: "tr-TR",
};

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export function languageFromLocale(locale: string | undefined | null) {
  if (!locale) return null;
  const base = locale.toLowerCase().split("-")[0];
  return isLanguage(base) ? base : null;
}
