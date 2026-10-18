import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultNamespace, resources } from "@/locales";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LOCALES,
  type Language,
  isLanguage,
  languageFromLocale,
} from "@/i18n/languages";

const LANGUAGE_STORAGE_KEY = "language-preference";

function readStoredLanguage(): Language | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

function detectBrowserLanguage(): Language | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const candidate of candidates) {
    const language = languageFromLocale(candidate);
    if (language) return language;
  }
  return null;
}

function syncDocumentLanguage(language: Language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
}

const i18n = createInstance();

const initialLanguage =
  readStoredLanguage() ?? detectBrowserLanguage() ?? DEFAULT_LANGUAGE;

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: defaultNamespace,
  ns: Object.keys(resources.en),
  interpolation: { escapeValue: false },
  initAsync: false,
});

syncDocumentLanguage(initialLanguage);

export function getCurrentLanguage(): Language {
  return isLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : DEFAULT_LANGUAGE;
}

export function getCurrentLocale() {
  return LANGUAGE_LOCALES[getCurrentLanguage()];
}

function writeStoredLanguage(language: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    return true;
  } catch {
    return false;
  }
}

export async function changeLanguage(language: Language) {
  writeStoredLanguage(language);
  await i18n.changeLanguage(language);
  syncDocumentLanguage(language);
}

export { i18n };
