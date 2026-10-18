import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/client/components/ui/combobox";
import { LOCATION_OPTIONS } from "@/shared/keyword-locations";
import { localizeCountryOptions } from "@/i18n/format";
import { getCurrentLocale } from "@/i18n/config";

type LocationOption = (typeof LOCATION_OPTIONS)[number];
type LocalizedLocationOption = LocationOption & { englishLabel: string };

// Matches the start of the name or of any word in it, so "uni" finds United
// States, not Tunisia, and "united states" still finds United States.
function matchesLabel(label: string, needle: string) {
  const lower = label.toLowerCase();
  return (
    lower.startsWith(needle) ||
    lower.split(/[\s-]+/).some((word) => word.startsWith(needle))
  );
}

function matchesCountry(option: LocalizedLocationOption, query: string) {
  const needle = query.trim().toLowerCase();
  return (
    matchesLabel(option.label, needle) ||
    matchesLabel(option.englishLabel, needle) ||
    option.shortLabel.toLowerCase().startsWith(needle)
  );
}

/** A searchable country picker. `value` is a DataForSEO location code. */
export function CountryCombobox({
  id,
  value,
  onChange,
  options = LOCATION_OPTIONS,
}: {
  id?: string;
  value: number;
  onChange: (locationCode: number) => void;
  /** Defaults to the full country list. */
  options?: readonly LocationOption[];
}) {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const localizedOptions = useMemo(
    () => localizeCountryOptions(options, locale),
    [options, locale],
  );
  const country =
    localizedOptions.find((option) => option.code === value) ?? null;

  return (
    <Combobox
      items={localizedOptions}
      value={country}
      itemToStringLabel={(option) => option.label}
      autoHighlight
      filter={matchesCountry}
      onValueChange={(option) => {
        if (option) onChange(option.code);
      }}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder={t("location.searchCountries")}
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
