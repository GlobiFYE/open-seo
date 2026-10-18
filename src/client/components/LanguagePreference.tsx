import { useTranslation } from "react-i18next";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/client/components/ui/dropdown-menu";
import { changeLanguage, getCurrentLanguage } from "@/i18n/config";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  isLanguage,
} from "@/i18n/languages";

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((language) => ({
  value: language,
  label: LANGUAGE_LABELS[language],
  icon: <span className="text-[11px] font-semibold uppercase">{language}</span>,
}));

function useLanguagePreference() {
  useTranslation();
  return {
    language: getCurrentLanguage(),
    setLanguage: (value: string) => {
      if (isLanguage(value)) void changeLanguage(value);
    },
  };
}

export function LanguagePreferenceRadio() {
  const { language, setLanguage } = useLanguagePreference();

  return (
    <SegmentedToggle
      items={LANGUAGE_OPTIONS}
      value={language}
      onChange={setLanguage}
    />
  );
}

export function LanguagePreferenceDropdownItems() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguagePreference();

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
        {LANGUAGE_OPTIONS.map(({ value, label }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}
