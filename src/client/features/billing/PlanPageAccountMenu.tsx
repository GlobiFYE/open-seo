import { Link } from "@tanstack/react-router";
import { Settings, User } from "lucide-react";
import { ThemePreferenceDropdownItems } from "@/client/components/ThemePreferenceMenuItems";
import { LanguagePreferenceDropdownItems } from "@/client/components/LanguagePreference";
import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { signOutAndRedirect } from "@/lib/auth-client";

// Shared account menu for onboarding and standalone plan pages.
export function PlanPageAccountMenu({ email }: { email: string | undefined }) {
  const { t } = useTranslation("nav");
  if (!email) return null;

  return (
    <div className="fixed top-4 right-4 z-20">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("account.openMenu")}
            />
          }
        >
          <User className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate" data-ph-mask>
              {email}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/settings" />}>
            <Settings className="size-4" /> {t("account.settings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemePreferenceDropdownItems />
          <DropdownMenuSeparator />
          <LanguagePreferenceDropdownItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOutAndRedirect()}
          >
            {t("account.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
