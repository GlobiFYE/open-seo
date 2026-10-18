import type { ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import {
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/client/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { type ThemePreference, useThemePreference } from "@/client/lib/theme";

const THEME_OPTIONS: {
  value: ThemePreference;
  labelKey: "theme.system" | "theme.light" | "theme.dark";
  icon: ReactNode;
}[] = [
  { value: "system", labelKey: "theme.system", icon: <Monitor /> },
  { value: "light", labelKey: "theme.light", icon: <Sun /> },
  { value: "dark", labelKey: "theme.dark", icon: <Moon /> },
];

function useThemeOptions() {
  const { t } = useTranslation();
  return THEME_OPTIONS.map(({ labelKey, ...option }) => ({
    ...option,
    label: t(labelKey),
  }));
}

/** System / Light / Dark segmented radio, shared by Settings and account menus. */
export function ThemePreferenceRadio() {
  const { themePreference, setThemePreference } = useThemePreference();
  const options = useThemeOptions();

  return (
    <SegmentedToggle
      items={options}
      value={themePreference}
      onChange={setThemePreference}
    />
  );
}

export function ThemePreferenceDropdownItems() {
  const { themePreference, setThemePreference } = useThemePreference();
  const options = useThemeOptions();
  const { t } = useTranslation();

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={themePreference}
        onValueChange={(value) => {
          const option = options.find((item) => item.value === value);
          if (option) setThemePreference(option.value);
        }}
      >
        {options.map(({ value, label, icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            {icon} {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}
