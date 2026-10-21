// How reachable a lead is, derived from what enrichment found. Shared by the
// app, the CSV export and the MCP tools so every surface sorts leads the same
// way.

export type LeadReachability =
  | "pending"
  | "ready"
  | "email_unreachable"
  | "social_only"
  | "no_contact";

export const LEAD_REACHABILITY_ORDER: LeadReachability[] = [
  "ready",
  "social_only",
  "email_unreachable",
  "no_contact",
  "pending",
];

export function leadReachability(lead: {
  enrichmentStatus: "pending" | "done" | "failed" | "no_website";
  primaryEmail: string | null;
  emailCount: number;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  phone: string | null;
}): LeadReachability {
  if (lead.enrichmentStatus === "pending") return "pending";
  if (lead.primaryEmail) return "ready";
  const hasSocial = Boolean(
    lead.instagramUrl || lead.facebookUrl || lead.whatsappUrl,
  );
  if (lead.emailCount > 0) return "email_unreachable";
  if (hasSocial || lead.phone) return "social_only";
  return "no_contact";
}
