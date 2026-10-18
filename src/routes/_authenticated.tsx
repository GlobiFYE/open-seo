import { useTranslation } from "react-i18next";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { AuthPageCard, AuthPageShell } from "@/client/features/auth/AuthPage";
import { useHostedAuthRouteGuard } from "@/client/features/auth/useHostedAuthRouteGuard";
import { PageLoading } from "@/client/components/Spinner";
import { Button } from "@/client/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedShellLayout,
});

function AuthenticatedShellLayout() {
  const { t } = useTranslation();
  const authGate = useHostedAuthRouteGuard();

  // Every page under this layout is hosted-only.
  if (!authGate.isHostedMode) {
    return (
      <AuthPageShell>
        <AuthPageCard
          title={t("notAvailable.title")}
          helperText={t("notAvailable.description")}
        >
          <Button
            nativeButton={false}
            render={<Link to="/" />}
            variant="secondary"
            className="w-full"
          >
            {t("actions.backToApp")}
          </Button>
        </AuthPageCard>
      </AuthPageShell>
    );
  }

  if (!authGate.canRenderAuthenticatedContent) {
    return <PageLoading />;
  }

  return (
    <AuthPageShell>
      <Outlet />
    </AuthPageShell>
  );
}
