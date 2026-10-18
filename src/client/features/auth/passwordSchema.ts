import { z } from "zod";
import { i18n } from "@/i18n/config";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";

export const passwordSchema = z
  .string()
  .min(HOSTED_PASSWORD_MIN_LENGTH, {
    error: () =>
      i18n.t("auth:validation.passwordTooShort", {
        count: HOSTED_PASSWORD_MIN_LENGTH,
      }),
  })
  .max(HOSTED_PASSWORD_MAX_LENGTH, {
    error: () =>
      i18n.t("auth:validation.passwordTooLong", {
        count: HOSTED_PASSWORD_MAX_LENGTH,
      }),
  });
