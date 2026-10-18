import { getCurrentLanguage, i18n } from "@/i18n/config";
import { resources } from "@/locales";

type AuthServerErrorCode =
  keyof (typeof resources)["en"]["auth"]["serverErrors"];

function isAuthServerErrorCode(code: string): code is AuthServerErrorCode {
  return code in resources.en.auth.serverErrors;
}

export function getAuthErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string,
) {
  if (error?.code && isAuthServerErrorCode(error.code)) {
    return i18n.t(`auth:serverErrors.${error.code}`);
  }
  if (error?.message && getCurrentLanguage() === "en") return error.message;
  return fallback;
}
