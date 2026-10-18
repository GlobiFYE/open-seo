import { Link, createFileRoute } from "@tanstack/react-router";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { i18n } from "@/i18n/config";
import { getAuthErrorMessage } from "@/client/features/auth/authErrorMessage";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ error: () => i18n.t("auth:validation.invalidEmail") }),
});

export const Route = createFileRoute("/forgot-password")({
  validateSearch: authRedirectSearchSchema,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();

  const form = useAppForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const redirectUrl = new URL("/reset-password", window.location.origin);
        if (redirectTo !== "/")
          redirectUrl.searchParams.set("redirect", redirectTo);
        const result = await authClient.requestPasswordReset({
          email: value.email.trim(),
          redirectTo: redirectUrl.toString(),
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form: getAuthErrorMessage(
                result.error,
                t("forgotPassword.failed"),
              ),
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: t("forgotPassword.failedRetry"),
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
          isSuccess: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submittedEmail: state.values.email,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isSuccess, submittedEmail, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);

          return (
            <AuthPageCard
              title={
                isSuccess
                  ? t("forgotPassword.successTitle")
                  : t("forgotPassword.title")
              }
              helperText={
                isSuccess
                  ? undefined
                  : isHostedMode
                    ? t("forgotPassword.helper")
                    : t("forgotPassword.unavailable")
              }
              footer={
                <p className="text-sm">
                  <Link
                    to="/sign-in"
                    search={getSignInSearch(redirectTo)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("forgotPassword.backToSignIn")}
                  </Link>
                </p>
              }
            >
              {isSuccess ? (
                <Alert variant="success">
                  <AlertDescription>
                    {t("forgotPassword.success", { email: submittedEmail })}
                  </AlertDescription>
                </Alert>
              ) : (
                <form.AppForm>
                  <form.Form className="space-y-4">
                    <form.AppField name="email">
                      {(field) => (
                        <field.TextField
                          label={t("fields.email")}
                          type="email"
                          placeholder={t("fields.emailPlaceholder")}
                          autoComplete="email"
                          disabled={!isHostedMode}
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
                      disabled={!isHostedMode}
                    >
                      {isSubmitting
                        ? t("forgotPassword.submitting")
                        : t("forgotPassword.submit")}
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
