import { Link, createFileRoute } from "@tanstack/react-router";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { passwordSchema } from "@/client/features/auth/passwordSchema";
import { getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { i18n } from "@/i18n/config";
import { getAuthErrorMessage } from "@/client/features/auth/authErrorMessage";

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    error: () => i18n.t("auth:validation.passwordsMismatch"),
    path: ["confirmPassword"],
  });

const resetPasswordSearchSchema = authRedirectSearchSchema.extend({
  error: z.string().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

function getResetPasswordErrorMessage(error: string | undefined) {
  switch ((error ?? "").toLowerCase()) {
    case "invalid_token":
      return i18n.t("auth:resetPassword.invalidToken");
    case "token_expired":
      return i18n.t("auth:resetPassword.tokenExpired");
    default:
      return error ? i18n.t("auth:resetPassword.unusable") : null;
  }
}

function getResetPasswordPageCopy({
  isHostedMode,
  isComplete,
  routeError,
  hasToken,
}: {
  isHostedMode: boolean;
  isComplete: boolean;
  routeError: string | null;
  hasToken: boolean;
}) {
  if (!isHostedMode) {
    return {
      title: i18n.t("auth:resetPassword.title"),
      helperText: i18n.t("auth:forgotPassword.unavailable"),
    };
  }

  if (isComplete) {
    return {
      title: i18n.t("auth:resetPassword.completeTitle"),
      helperText: i18n.t("auth:resetPassword.completeHelper"),
    };
  }

  if (routeError || !hasToken) {
    return {
      title: i18n.t("auth:resetPassword.expiredTitle"),
      helperText: routeError || i18n.t("auth:resetPassword.invalidToken"),
    };
  }

  return {
    title: i18n.t("auth:resetPassword.title"),
    helperText: i18n.t("auth:resetPassword.helper"),
  };
}

function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  const routeError = getResetPasswordErrorMessage(search.error);
  const token = search.token;
  const form = useAppForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    // The form only renders when the URL carries a token.
    onSubmit: async ({ formApi, value }) => {
      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form:
                result.error.code === "INVALID_TOKEN"
                  ? t("resetPassword.invalidTokenRetry")
                  : getAuthErrorMessage(
                      result.error,
                      t("resetPassword.invalidTokenRetry"),
                    ),
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: t("resetPassword.failedRetry"),
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageShell>
      <form.Subscribe
        selector={(state) => ({
          isComplete: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isComplete, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);
          const pageCopy = getResetPasswordPageCopy({
            isHostedMode,
            isComplete,
            routeError,
            hasToken: !!token,
          });

          return (
            <AuthPageCard
              title={pageCopy.title}
              helperText={pageCopy.helperText}
              footer={
                isComplete ? undefined : (
                  <p className="text-sm">
                    <Link
                      to="/sign-in"
                      search={getSignInSearch(redirectTo)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("resetPassword.signIn")}
                    </Link>
                  </p>
                )
              }
            >
              {!isHostedMode ? null : isComplete ? (
                <Button
                  nativeButton={false}
                  variant="secondary"
                  className="w-full"
                  render={
                    <Link to="/sign-in" search={getSignInSearch(redirectTo)} />
                  }
                >
                  {t("resetPassword.continueToSignIn")}
                </Button>
              ) : routeError || !token ? (
                <Button
                  nativeButton={false}
                  variant="secondary"
                  className="w-full"
                  render={
                    <Link
                      to="/forgot-password"
                      search={getSignInSearch(redirectTo)}
                    />
                  }
                >
                  {t("resetPassword.requestNewLink")}
                </Button>
              ) : (
                <form.AppForm>
                  <form.Form className="space-y-4">
                    <form.AppField name="password">
                      {(field) => (
                        <field.TextField
                          label={t("fields.newPassword")}
                          type="password"
                          placeholder={t("fields.newPasswordPlaceholder")}
                          autoComplete="new-password"
                          required
                        />
                      )}
                    </form.AppField>
                    <form.AppField name="confirmPassword">
                      {(field) => (
                        <field.TextField
                          label={t("fields.confirmNewPassword")}
                          type="password"
                          placeholder={t(
                            "fields.confirmNewPasswordPlaceholder",
                          )}
                          autoComplete="new-password"
                          required
                        />
                      )}
                    </form.AppField>

                    {errorMessage ? (
                      <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button
                      type="submit"
                      variant="secondary"
                      className="w-full"
                      pending={isSubmitting}
                    >
                      {isSubmitting
                        ? t("resetPassword.submitting")
                        : t("resetPassword.submit")}
                    </Button>
                  </form.Form>
                </form.AppForm>
              )}
            </AuthPageCard>
          );
        }}
      </form.Subscribe>
    </AuthPageShell>
  );
}
