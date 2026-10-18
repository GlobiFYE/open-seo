import { sort } from "remeda";
import { getCurrentLocale } from "@/i18n/config";

const REGION_OVERRIDES: Record<string, string> = { UK: "GB" };

const displayNameCache = new Map<string, Intl.DisplayNames | null>();

function getDisplayNames(
  type: "region" | "language",
  locale = getCurrentLocale(),
) {
  const key = `${locale}:${type}`;
  if (!displayNameCache.has(key)) {
    try {
      displayNameCache.set(key, new Intl.DisplayNames([locale], { type }));
    } catch {
      displayNameCache.set(key, null);
    }
  }
  return displayNameCache.get(key) ?? null;
}

function getCountryName(
  regionCode: string,
  fallback: string,
  locale = getCurrentLocale(),
) {
  const code = REGION_OVERRIDES[regionCode] ?? regionCode;
  try {
    return getDisplayNames("region", locale)?.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getLanguageName(languageCode: string, fallback: string) {
  try {
    const name = getDisplayNames("language")?.of(languageCode);
    if (!name || name === languageCode) return fallback;
    return name.charAt(0).toLocaleUpperCase(getCurrentLocale()) + name.slice(1);
  } catch {
    return fallback;
  }
}

export function localizeCountryOptions<
  T extends { label: string; shortLabel: string },
>(
  options: readonly T[],
  locale = getCurrentLocale(),
): (T & { englishLabel: string })[] {
  const localized = options.map((option) => ({
    ...option,
    label: getCountryName(option.shortLabel, option.label, locale),
    englishLabel: option.label,
  }));
  return sort(localized, (a, b) => a.label.localeCompare(b.label, locale));
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(getCurrentLocale(), options).format(value);
}
