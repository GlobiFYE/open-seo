import { Link } from "@tanstack/react-router";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { AppBanner } from "@/client/layout/AppBanner";
import { dataforseoHelpLinkOptions } from "@/client/navigation/items";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";

function SeoApiStatusBanners({
  shouldShowSeoApiWarning,
  seoApiKeyStatusError,
}: {
  shouldShowSeoApiWarning: boolean;
  seoApiKeyStatusError: boolean;
}) {
  const { t } = useTranslation();
  const icon = <AlertTriangle className="size-4 shrink-0" />;
  const helpLink = (
    <Link
      {...dataforseoHelpLinkOptions}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {t("setup.helpPage")}
    </Link>
  );
  return (
    <>
      {shouldShowSeoApiWarning ? (
        <AppBanner variant="warning" icon={icon}>
          <Trans i18nKey="setup.missingKeyBanner" components={{ helpLink }} />
        </AppBanner>
      ) : null}

      {seoApiKeyStatusError ? (
        <AppBanner variant="info" icon={icon}>
          <Trans i18nKey="setup.unverifiedBanner" components={{ helpLink }} />
        </AppBanner>
      ) : null}
    </>
  );
}

function MissingSeoSetupModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <div className="rounded-full bg-warning/20 p-2 text-warning">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-2">
            <DialogTitle>{t("setup.modalTitle")}</DialogTitle>
            <DialogDescription>{t("setup.modalDescription")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("actions.dismiss")}
          </Button>
          <Button
            nativeButton={false}
            render={<Link {...dataforseoHelpLinkOptions} onClick={onClose} />}
          >
            {t("setup.openGuide")}
            <ExternalLink className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { MissingSeoSetupModal, SeoApiStatusBanners };
