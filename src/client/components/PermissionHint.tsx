import { useTranslation } from "react-i18next";
import { cn } from "cn";

/** Shown where a missing permission would otherwise leave a card or step empty. */
export function PermissionHint({
  action,
  className,
}: {
  action: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {t("permissionHint", { action })}
    </p>
  );
}
