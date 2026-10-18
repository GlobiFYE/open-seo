import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ApiKeySettings } from "@/client/features/settings/ApiKeySettings";
import { SectionHeader } from "@/client/components/PageHeader";
import { ThemePreferenceRadio } from "@/client/components/ThemePreferenceMenuItems";
import { LanguagePreferenceRadio } from "@/client/components/LanguagePreference";
import { Switch } from "@/client/components/ui/switch";
import { authClient, useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { version } from "../../../../package.json";

export const Route = createFileRoute("/_app/settings/")({
  component: PersonalSettings,
});

function PersonalSettings() {
  const { t } = useTranslation("settings");
  const isHosted = isHostedClientAuthMode();
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const analyticsEnabled = session?.user?.analyticsOptedOut !== true;

  async function updateAnalyticsPreference(enabled: boolean) {
    setIsSaving(true);
    try {
      const result = await authClient.updateUser({
        analyticsOptedOut: !enabled,
      });
      if (result.error) {
        toast.error(t("analytics.failed"));
      } else {
        toast.success(
          enabled ? t("analytics.enabled") : t("analytics.disabled"),
        );
      }
    } catch {
      toast.error(t("analytics.failed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <SectionHeader title={t("appearance")} />
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm">{t("theme")}</span>
          <ThemePreferenceRadio />
        </div>
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm">{t("language")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("languageDescription")}
            </p>
          </div>
          <LanguagePreferenceRadio />
        </div>
      </section>

      {isHosted ? (
        <>
          <ApiKeySettings />

          <section className="space-y-3">
            <SectionHeader title={t("analytics.title")} />
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm">{t("analytics.label")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("analytics.description")}
                </p>
              </div>
              <Switch
                checked={analyticsEnabled}
                disabled={isSaving}
                onCheckedChange={(checked) => {
                  void updateAnalyticsPreference(checked);
                }}
                aria-label={t("analytics.toggle")}
              />
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-3">
          <SectionHeader title={t("about")} />
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm">{t("version")}</span>
            <span className="font-mono text-sm text-muted-foreground">
              v{version}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
