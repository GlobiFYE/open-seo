import enAuth from "./en/auth.json";
import enBlogTracking from "./en/blogTracking.json";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import enNav from "./en/nav.json";
import enSettings from "./en/settings.json";
import enOnboarding from "./en/onboarding.json";
import enIntegrations from "./en/integrations.json";
import trAuth from "./tr/auth.json";
import trBlogTracking from "./tr/blogTracking.json";
import trCommon from "./tr/common.json";
import trErrors from "./tr/errors.json";
import trNav from "./tr/nav.json";
import trSettings from "./tr/settings.json";
import trOnboarding from "./tr/onboarding.json";
import trIntegrations from "./tr/integrations.json";

export const resources = {
  en: {
    auth: enAuth,
    blogTracking: enBlogTracking,
    common: enCommon,
    errors: enErrors,
    nav: enNav,
    settings: enSettings,
    onboarding: enOnboarding,
    integrations: enIntegrations,
  },
  tr: {
    auth: trAuth,
    blogTracking: trBlogTracking,
    common: trCommon,
    errors: trErrors,
    nav: trNav,
    settings: trSettings,
    onboarding: trOnboarding,
    integrations: trIntegrations,
  },
} as const;

export const defaultNamespace = "common";
