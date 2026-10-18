import type { defaultNamespace, resources } from "@/locales";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNamespace;
    resources: (typeof resources)["en"];
  }
}
