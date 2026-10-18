import { Trans, useTranslation } from "react-i18next";
import { useEffect, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInHref, getSignInHrefForLocation } from "@/lib/auth-redirect";

const CLOUDFLARE_SETUP_GUIDE_URL =
  "https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE.md#2-configure-authentication-and-secrets";

type CardProps = {
  message: string;
  onRetry: () => void;
};

/**
 * The card for an auth failure, else `fallback`. The route error boundary and
 * the landing redirect both render errors through this, so each auth error
 * code shows the same card everywhere.
 */
export function AuthErrorCard({
  error,
  onRetry,
  fallback,
}: {
  error: unknown;
  onRetry: () => void;
  fallback: ReactNode;
}) {
  const errorCode = getErrorCode(error);
  if (errorCode !== "AUTH_CONFIG_MISSING" && errorCode !== "UNAUTHENTICATED") {
    return fallback;
  }

  return (
    <AuthErrorContent error={error} errorCode={errorCode} onRetry={onRetry} />
  );
}

function AuthErrorContent({
  error,
  errorCode,
  onRetry,
}: {
  error: unknown;
  errorCode: "AUTH_CONFIG_MISSING" | "UNAUTHENTICATED";
  onRetry: () => void;
}) {
  const { t } = useTranslation("errors");
  const message = getStandardErrorMessage(error, t("generic"));
  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center p-4">
      {errorCode === "AUTH_CONFIG_MISSING" ? (
        <AuthConfigErrorCard message={message} onRetry={onRetry} />
      ) : (
        <UnauthenticatedErrorCard message={message} onRetry={onRetry} />
      )}
    </div>
  );
}

function AuthConfigErrorCard({ message, onRetry }: CardProps) {
  // Only name a mode's settings when the client build names that mode. With
  // AUTH_MODE unset here the server mode is unknown, and the alert above
  // already carries the server's exact message.
  const clientAuthMode = import.meta.env.AUTH_MODE;
  const { t } = useTranslation();
  const code = <code className="mx-1" />;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-destructive" />
          {t("authConfig.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        {clientAuthMode === "hosted" ? (
          <p className="text-muted-foreground">
            <Trans t={t} i18nKey="authConfig.hosted" components={{ code }} />
          </p>
        ) : null}
        {clientAuthMode === "cloudflare_access" ? (
          <p className="text-muted-foreground">
            <Trans
              t={t}
              i18nKey="authConfig.cloudflare"
              components={{ code }}
            />
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" onClick={onRetry}>
          {t("actions.tryAgain")}
        </Button>
        <Button
          nativeButton={false}
          render={
            <a
              href={CLOUDFLARE_SETUP_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          {t("actions.openSetupGuide")}
        </Button>
      </CardFooter>
    </Card>
  );
}

function UnauthenticatedErrorCard({ message, onRetry }: CardProps) {
  const { t } = useTranslation();
  const isHostedMode = isHostedClientAuthMode();
  const signInHref =
    typeof window === "undefined"
      ? getSignInHref("/")
      : getSignInHrefForLocation(window.location);

  useEffect(() => {
    if (typeof window === "undefined" || !isHostedMode) {
      return;
    }

    window.location.replace(signInHref);
  }, [isHostedMode, signInHref]);

  if (isHostedMode) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("authConfig.unauthenticatedTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-muted-foreground">
        <p>{message}</p>
        <p>{t("authConfig.unauthenticatedBody")}</p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onRetry}>{t("actions.tryAgain")}</Button>
      </CardFooter>
    </Card>
  );
}
