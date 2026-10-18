import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Database, KeyRound, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { captureClientEvent } from "@/client/lib/posthog";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

export const Route = createFileRoute("/_authenticated/oauth-consent")({
  component: OAuthConsentPage,
});

const SCOPES = [
  {
    icon: Database,
    labelKey: "consent.readScope",
    descriptionKey: "consent.readScopeDescription",
  },
  {
    icon: KeyRound,
    labelKey: "consent.actScope",
    descriptionKey: "consent.actScopeDescription",
  },
] as const;

function OAuthConsentPage() {
  const { t } = useTranslation("auth");
  const { data: session } = useSession();
  const [pendingAction, setPendingAction] = useState<
    "authorize" | "cancel" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureClientEvent("mcp:consent_viewed");
  }, []);

  async function respond(accept: boolean) {
    setError(null);
    setPendingAction(accept ? "authorize" : "cancel");
    if (!accept) {
      captureClientEvent("mcp:consent_denied");
    }

    try {
      const response = await fetch("/api/oauth/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accept,
          query: window.location.search,
        }),
      });
      const data: {
        redirectTo?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        setError(data.error ?? t("consent.failed"));
      } else if (data.redirectTo) {
        window.location.assign(data.redirectTo);
        return;
      } else {
        setError(t("consent.missingRedirect"));
      }
    } catch {
      setError(t("consent.unreachable"));
    }
    setPendingAction(null);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center text-center">
        <img
          src="/transparent-logo.png"
          alt="MericSEO"
          className="size-10 rounded-lg"
        />
        <CardTitle className="mt-5 text-xl">
          <h1>{t("consent.title")}</h1>
        </CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("consent.description")}
        </p>
      </CardHeader>
      <CardContent>
        {/* _authenticated only renders this page with a signed-in user. */}
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <div className="flex size-7 items-center justify-center rounded-full bg-muted">
            <User className="size-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">
              {t("consent.signedInAs")}
            </div>
            <div className="font-medium">{session?.user.email}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("consent.willAllow")}
          </div>
          <ul className="mt-3 space-y-3">
            {SCOPES.map((scope) => (
              <li key={scope.labelKey} className="flex gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{t(scope.labelKey)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(scope.descriptionKey)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-8 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            pending={pendingAction === "cancel"}
            disabled={pendingAction !== null}
            onClick={() => void respond(false)}
          >
            {pendingAction === "cancel"
              ? t("consent.canceling")
              : t("consent.cancel")}
          </Button>
          <Button
            type="button"
            className="flex-1"
            pending={pendingAction === "authorize"}
            disabled={pendingAction !== null}
            onClick={() => void respond(true)}
          >
            {pendingAction === "authorize"
              ? t("consent.authorizing")
              : t("consent.authorize")}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("consent.revokeHint")}
        </p>
      </CardContent>
    </Card>
  );
}
