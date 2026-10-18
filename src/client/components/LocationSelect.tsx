import { useTranslation } from "react-i18next";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/client/components/ui/combobox";
import { useMemo } from "react";
import { LOCATION_OPTIONS } from "@/shared/keyword-locations";
import { localizeCountryOptions } from "@/i18n/format";
import { getCurrentLocale } from "@/i18n/config";

type LocationOption = (typeof LOCATION_OPTIONS)[number];
type LocalizedLocationOption = LocationOption & { englishLabel: string };

type Props = {
  value: number;
  onChange: (locationCode: number) => void;
  /** Defaults to the full country list. Pass a subset (e.g. Labs-only). */
  options?: readonly LocationOption[];
  /** Width utilities for the field. Defaults to full width. */
  className?: string;
};

function matches(option: LocalizedLocationOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    option.label.toLowerCase().includes(needle) ||
    option.englishLabel.toLowerCase().includes(needle) ||
    option.shortLabel.toLowerCase().includes(needle)
  );
}

/** Searchable country picker: type to filter the country list. */
export function LocationSelect({
  value,
  onChange,
  options = LOCATION_OPTIONS,
  className = "w-full",
}: Props) {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const localizedOptions = useMemo(
    () => localizeCountryOptions(options, locale),
    [options, locale],
  );
  const selected =
    localizedOptions.find((option) => option.code === value) ?? null;

  return (
    <Combobox
      items={localizedOptions}
      value={selected}
      itemToStringLabel={(option) => option.label}
      autoHighlight
      filter={matches}
      onValueChange={(option) => {
        if (option) onChange(option.code);
      }}
    >
      <ComboboxInput
        className={className}
        placeholder={t("location.selectCountry")}
        aria-label={t("location.country")}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("location.noCountries")}</ComboboxEmpty>
        <ComboboxList>
          {(option: LocationOption) => (
            <ComboboxItem key={option.code} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
