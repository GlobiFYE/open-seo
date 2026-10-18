import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/button";
import { i18n } from "@/i18n/config";
import type { GooglePickerAccount } from "./GooglePropertyPicker";

export function accountLabel(account: GooglePickerAccount) {
  return (
    account.email ??
    i18n.t("integrations:picker.googleAccount", {
      suffix: account.accountId.slice(-6),
    })
  );
}

export function AccountStatusRow({
  account,
  label,
  linking,
  onReconnect,
  onRetry,
}: {
  account: GooglePickerAccount;
  label: string;
  linking: boolean;
  onReconnect: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation(["integrations", "common"]);
  if (account.requiresReconnect) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 text-sm">
        <span className="text-muted-foreground">
          {t("picker.connectionExpired")}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={onReconnect}
          aria-label={t("picker.reconnectLabel", { account: label })}
          disabled={linking}
          aria-busy={linking}
        >
          {linking ? t("picker.openingGoogle") : t("picker.reconnect")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 text-sm">
      <span className="text-muted-foreground">
        {account.apiDisabled
          ? t("picker.apiDisabled")
          : t("picker.propertiesUnavailable")}
      </span>
      <Button variant="ghost" size="xs" onClick={onRetry}>
        {t("common:actions.retry")}
      </Button>
    </div>
  );
}

export function handlePropertyKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  close: () => void,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button[data-property]:not(:disabled)",
    ),
  );
  if (!buttons.length) return;
  event.preventDefault();
  const index = buttons.findIndex(
    (button) => button === document.activeElement,
  );
  const nextIndex =
    index < 0
      ? event.key === "ArrowDown"
        ? 0
        : buttons.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) %
        buttons.length;
  buttons[nextIndex]?.focus();
}
