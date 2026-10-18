import { useState } from "react";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";
import { toAuthCallbackURL } from "@/lib/auth-redirect";
import { i18n } from "@/i18n/config";
import { getAuthErrorMessage } from "@/client/features/auth/authErrorMessage";

export function useGoogleAuth({
  redirectTo,
  postSignupRedirect,
}: {
  redirectTo: string;
  postSignupRedirect?: string;
}) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignUp = postSignupRedirect !== undefined;

  async function start() {
    setError(null);
    setIsStarting(true);
    try {
      captureClientEvent(
        isSignUp ? "auth:sign_up_google_start" : "auth:sign_in_google_start",
        { redirect_to: redirectTo },
      );
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: toAuthCallbackURL(redirectTo),
        ...(isSignUp
          ? {
              newUserCallbackURL: toAuthCallbackURL(postSignupRedirect),
              requestSignUp: true,
            }
          : {}),
      });
      if (!result.error) return;
      setError(getAuthErrorMessage(result.error, getFallbackMessage()));
    } catch {
      setError(getFallbackMessage());
    }
    setIsStarting(false);
  }

  const getFallbackMessage = () =>
    i18n.t(
      isSignUp
        ? "auth:chooser.googleSignUpUnavailable"
        : "auth:chooser.googleSignInUnavailable",
    );

  return { isStarting, error, start, clearError: () => setError(null) };
}
