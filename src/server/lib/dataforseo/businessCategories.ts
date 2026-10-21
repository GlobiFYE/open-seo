import { z } from "zod";
import { fetchBusinessListingsCategories } from "@/server/lib/dataforseo";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";

// The Business Listings category list is free at DataForSEO and takes no
// parameters, so one cached copy serves every caller and every filter.

const BUSINESS_CATEGORIES_CACHE_NAMESPACE = "local:business-categories";
const BUSINESS_CATEGORIES_TTL_SECONDS = 7 * 24 * 60 * 60;

const cachedCategoriesSchema = z.array(
  z.object({ category: z.string(), businessCount: z.number().nullable() }),
);

type BusinessCategory = z.infer<typeof cachedCategoriesSchema>[number];

export async function getBusinessCategories(): Promise<BusinessCategory[]> {
  const cacheKey = await buildCacheKey(BUSINESS_CATEGORIES_CACHE_NAMESPACE, {});
  const cached = cachedCategoriesSchema.safeParse(await getCached(cacheKey));
  if (cached.success) return cached.data;
  const all = (await fetchBusinessListingsCategories()).data;
  await setCached(cacheKey, all, BUSINESS_CATEGORIES_TTL_SECONDS);
  return all;
}
