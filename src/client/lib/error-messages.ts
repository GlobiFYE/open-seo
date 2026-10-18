import { FREE_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { isErrorCode, type ErrorCode } from "@/shared/error-codes";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { i18n } from "@/i18n/config";

export function getUnexpectedErrorMessage() {
  return i18n.t(
    isHostedClientAuthMode()
      ? "errors:unexpectedHosted"
      : "errors:unexpectedSelfHosted",
  );
}

function getCodeMessage(code: ErrorCode) {
  if (code === "INTERNAL_ERROR") return getUnexpectedErrorMessage();
  if (code === "AUDIT_PAGE_LIMIT_EXCEEDED") {
    return i18n.t("errors:codes.AUDIT_PAGE_LIMIT_EXCEEDED", {
      count: FREE_MAX_AUDIT_PAGES,
    });
  }
  return i18n.t(`errors:codes.${code}`);
}

export function getStandardErrorMessage(
  error: unknown,
  fallback: string = getUnexpectedErrorMessage(),
): string {
  if (!(error instanceof Error)) return fallback;
  if (isErrorCode(error.message)) return getCodeMessage(error.message);
  if (error.message) return error.message;
  return fallback;
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (!(error instanceof Error)) return null;
  return isErrorCode(error.message) ? error.message : null;
}
