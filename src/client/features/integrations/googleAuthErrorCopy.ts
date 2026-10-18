/**
 * Plain-language copy for Google OAuth failures, shared by the connect-surface
 * inline alert (GoogleLinkErrorAlert) and the /auth-error fallback page.
 * `code` is the `error` query param on the redirect: Google's own error code
 * (access_denied), or one set by googleOAuth.ts / Better Auth.
 *
 * `providerLabel` ("Search Console" / "Google Analytics") is set when the
 * failure came from a connect flow; without it the copy reads as a Google
 * sign-in failure.
 */
import { i18n } from "@/i18n/config";

export function googleAuthErrorCopy(
  code: string,
  providerLabel?: string,
): { title: string; description: string } {
  const what = providerLabel
    ? i18n.t("auth:google.connection", { provider: providerLabel })
    : i18n.t("auth:google.signIn");
  const provider = providerLabel ?? "Google";

  switch (code) {
    case "state_mismatch":
      return {
        title: i18n.t("auth:google.stateMismatchTitle", { what }),
        description: i18n.t("auth:google.stateMismatchDescription"),
      };
    case "access_denied":
      return {
        title: i18n.t("auth:google.accessDeniedTitle", { what }),
        description: i18n.t("auth:google.accessDeniedDescription"),
      };
    case "scope_not_granted":
      return {
        title: i18n.t("auth:google.scopeNotGrantedTitle", { what }),
        description: i18n.t("auth:google.scopeNotGrantedDescription", {
          provider,
        }),
      };
    case "connection_save_failed":
      return {
        title: i18n.t("auth:google.saveFailedTitle", { what }),
        description: i18n.t("auth:google.saveFailedDescription"),
      };
    default:
      return {
        title: i18n.t("auth:google.unknownTitle", { what }),
        description: i18n.t("auth:google.unknownDescription"),
      };
  }
}
