import { queryOptions } from "@tanstack/react-query";
import {
  getLeadSearch,
  listLeadCategories,
  listLeadSearches,
} from "@/serverFunctions/leads";

export const leadsQueryKey = (projectId: string) => ["leads", projectId];

export function leadSearchesOptions(projectId: string) {
  return queryOptions({
    queryKey: [...leadsQueryKey(projectId), "searches"],
    queryFn: () => listLeadSearches({ data: { projectId } }),
  });
}

export function leadSearchOptions(projectId: string, searchId: string) {
  return queryOptions({
    queryKey: [...leadsQueryKey(projectId), "search", searchId],
    queryFn: () => getLeadSearch({ data: { projectId, searchId } }),
  });
}

export function leadCategoriesOptions(projectId: string, query: string) {
  return queryOptions({
    queryKey: [...leadsQueryKey(projectId), "categories", query],
    queryFn: () => listLeadCategories({ data: { projectId, query } }),
    enabled: query.trim().length >= 2,
    staleTime: 60 * 60 * 1000,
  });
}

export type LeadSearchDetailData = Awaited<ReturnType<typeof getLeadSearch>>;
export type LeadRow = LeadSearchDetailData["leads"][number];
