import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/button";
import { QueryError } from "@/client/components/QueryState";
import type { GooglePickerAccount } from "./GooglePropertyPicker";

export function GscPropertySetupHelp({
  accounts,
  emptyGsc,
  loading,
  error,
  busy,
  linking,
  onRetry,
  onReconnect,
}: {
  accounts: GooglePickerAccount[];
  emptyGsc: boolean;
  loading: boolean;
  error: boolean;
  busy: boolean;
  linking: boolean;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  const { t } = useTranslation(["integrations", "common"]);
  if (!emptyGsc && !error) return null;

  return (
    <>
      {emptyGsc ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <h2 className="font-semibold">{t("gscHelp.notFoundTitle")}</h2>
          <p className="break-words text-muted-foreground">
            {t("gscHelp.checked", {
              accounts: accounts
                .map(
                  (account) =>
                    account.email ??
                    t("picker.googleAccount", {
                      suffix: account.accountId.slice(-6),
                    }),
                )
                .join(", "),
            })}
          </p>
          <p className="text-muted-foreground">
            {t("gscHelp.addSite", { count: accounts.length })}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t("gscHelp.openSearchConsole")}
            </a>
            <a
              href="https://openseo.so/blogs/google-search-console-setup"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t("gscHelp.setupGuide")}
            </a>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        {error ? (
          <QueryError fallback={t("gscHelp.loadFailed")} onRetry={onRetry} />
        ) : null}
        {emptyGsc ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={loading || busy}
            >
              {loading
                ? t("common:actions.refreshing")
                : t("common:actions.refresh")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReconnect}
              disabled={loading || busy}
              pending={linking}
            >
              {linking
                ? t("picker.openingGoogle")
                : t("gscHelp.differentAccount")}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function EmptyAccountMessage({
  provider,
  filtered,
}: {
  provider: "gsc" | "ga4";
  filtered: boolean;
}) {
  const { t } = useTranslation("integrations");
  if (filtered) return t("gscHelp.noMatchesInAccount");
  if (provider !== "gsc") return t("gscHelp.noProperties");
  return (
    <Trans
      t={t}
      i18nKey="gscHelp.noWebsites"
      components={{
        guideLink: (
          <a
            href="https://openseo.so/blogs/google-search-console-setup"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          />
        ),
      }}
    />
  );
}

export function hasNoGscWebsites(
  accounts: GooglePickerAccount[],
  loading: boolean,
  error: boolean,
) {
  return (
    !loading &&
    !error &&
    accounts.length > 0 &&
    accounts.every(
      (account) =>
        !account.requiresReconnect &&
        !account.unavailable &&
        account.properties.length === 0,
    )
  );
}
