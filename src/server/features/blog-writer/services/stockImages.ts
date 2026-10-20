import { z } from "zod";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import type { BlogImageSource } from "@/types/schemas/blog-writer";

const REQUEST_TIMEOUT_MS = 10_000;
const DOWNLOAD_WIDTH = 1600;
const UNSPLASH_UTM = "utm_source=mericseo&utm_medium=referral";

export type ImageCandidate = {
  candidateId: string;
  source: BlogImageSource;
  sourceId: string;
  url: string;
  previewUrl: string;
  pageUrl: string;
  description: string;
  credit: string;
  creditUrl?: string;
  downloadLocation?: string;
  productUrl?: string;
  productTitle?: string;
  width?: number;
  height?: number;
  query?: string;
};

type StockProvider = {
  source: Exclude<BlogImageSource, "product">;
  envKey: string;
  search: (
    apiKey: string,
    query: string,
    perPage: number,
  ) => Promise<ImageCandidate[]>;
};

const pexelsResponse = z.object({
  photos: z.array(
    z.object({
      id: z.number(),
      width: z.number(),
      height: z.number(),
      url: z.string(),
      alt: z.string().nullish(),
      photographer: z.string(),
      photographer_url: z.string().nullish(),
      src: z.object({ original: z.string(), medium: z.string() }),
    }),
  ),
});

const unsplashResponse = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      width: z.number(),
      height: z.number(),
      description: z.string().nullish(),
      alt_description: z.string().nullish(),
      urls: z.object({ raw: z.string(), small: z.string() }),
      links: z.object({ html: z.string(), download_location: z.string() }),
      user: z.object({
        name: z.string(),
        links: z.object({ html: z.string() }),
      }),
    }),
  ),
});

const pixabayHit = z.object({
  id: z.number(),
  pageURL: z.string(),
  tags: z.string(),
  previewURL: z.string(),
  largeImageURL: z.string(),
  imageWidth: z.number(),
  imageHeight: z.number(),
  user: z.string(),
  user_id: z.number(),
});

const pixabayResponse = z.object({ hits: z.array(pixabayHit) });

function withParams(base: string, params: Record<string, string>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value);
  return url.toString();
}

function withUtm(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}${UNSPLASH_UTM}`;
}

async function getJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as unknown;
}

async function searchPexels(apiKey: string, query: string, perPage: number) {
  const data = pexelsResponse.parse(
    await getJson(
      withParams("https://api.pexels.com/v1/search", {
        query,
        per_page: String(perPage),
        orientation: "landscape",
      }),
      { Authorization: apiKey },
    ),
  );
  return data.photos.map(
    (photo): ImageCandidate => ({
      candidateId: `pexels:${photo.id}`,
      source: "pexels",
      sourceId: String(photo.id),
      url: withParams(photo.src.original, {
        auto: "compress",
        cs: "tinysrgb",
        w: String(DOWNLOAD_WIDTH),
      }),
      previewUrl: photo.src.medium,
      pageUrl: photo.url,
      description: photo.alt ?? "",
      credit: `${photo.photographer} on Pexels`,
      creditUrl: photo.photographer_url ?? undefined,
      width: photo.width,
      height: photo.height,
      query,
    }),
  );
}

async function searchUnsplash(apiKey: string, query: string, perPage: number) {
  const data = unsplashResponse.parse(
    await getJson(
      withParams("https://api.unsplash.com/search/photos", {
        query,
        per_page: String(perPage),
        orientation: "landscape",
        content_filter: "high",
      }),
      { Authorization: `Client-ID ${apiKey}`, "Accept-Version": "v1" },
    ),
  );
  return data.results.map(
    (photo): ImageCandidate => ({
      candidateId: `unsplash:${photo.id}`,
      source: "unsplash",
      sourceId: photo.id,
      url: withParams(photo.urls.raw, {
        w: String(DOWNLOAD_WIDTH),
        q: "80",
        fm: "jpg",
        fit: "max",
      }),
      previewUrl: photo.urls.small,
      pageUrl: withUtm(photo.links.html),
      description: photo.alt_description ?? photo.description ?? "",
      credit: `${photo.user.name} on Unsplash`,
      creditUrl: withUtm(photo.user.links.html),
      downloadLocation: photo.links.download_location,
      width: photo.width,
      height: photo.height,
      query,
    }),
  );
}

function pixabayCandidate(
  hit: z.infer<typeof pixabayHit>,
  query?: string,
): ImageCandidate {
  return {
    candidateId: `pixabay:${hit.id}`,
    source: "pixabay",
    sourceId: String(hit.id),
    url: hit.largeImageURL,
    previewUrl: hit.previewURL,
    pageUrl: hit.pageURL,
    description: hit.tags,
    credit: `${hit.user} on Pixabay`,
    creditUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`,
    width: hit.imageWidth,
    height: hit.imageHeight,
    query,
  };
}

async function searchPixabay(apiKey: string, query: string, perPage: number) {
  const data = pixabayResponse.parse(
    await getJson(
      withParams("https://pixabay.com/api/", {
        key: apiKey,
        q: query.slice(0, 100),
        image_type: "photo",
        orientation: "horizontal",
        safesearch: "true",
        per_page: String(Math.max(3, perPage)),
      }),
    ),
  );
  return data.hits.slice(0, perPage).map((hit) => pixabayCandidate(hit, query));
}

const PROVIDERS: StockProvider[] = [
  { source: "pexels", envKey: "PEXELS_API_KEY", search: searchPexels },
  { source: "unsplash", envKey: "UNSPLASH_ACCESS_KEY", search: searchUnsplash },
  { source: "pixabay", envKey: "PIXABAY_API_KEY", search: searchPixabay },
];

async function configuredStockSources() {
  const keys = await Promise.all(
    PROVIDERS.map(async (provider) => ({
      provider,
      apiKey: await getOptionalEnvValue(provider.envKey),
    })),
  );
  return keys.filter(
    (entry): entry is { provider: StockProvider; apiKey: string } =>
      Boolean(entry.apiKey),
  );
}

export async function searchStockImages(queries: string[], perQuery: number) {
  const providers = await configuredStockSources();
  const tasks = providers.flatMap(({ provider, apiKey }) =>
    queries.map(async (query) => {
      try {
        return { images: await provider.search(apiKey, query, perQuery) };
      } catch (error) {
        return {
          images: [],
          error: `${provider.source} "${query}": ${error instanceof Error ? error.message : "failed"}`,
        };
      }
    }),
  );
  const results = await Promise.all(tasks);
  const seen = new Set<string>();
  const images: ImageCandidate[] = [];
  for (const result of results) {
    for (const image of result.images) {
      if (seen.has(image.candidateId)) continue;
      seen.add(image.candidateId);
      images.push(image);
    }
  }
  return {
    images,
    sources: providers.map(({ provider }) => provider.source),
    missingSources: PROVIDERS.filter(
      (provider) =>
        !providers.some((entry) => entry.provider.source === provider.source),
    ).map((provider) => provider.envKey),
    errors: results.flatMap((result) => (result.error ? [result.error] : [])),
  };
}

export async function refreshPixabayUrl(sourceId: string) {
  const apiKey = await getOptionalEnvValue("PIXABAY_API_KEY");
  if (!apiKey) return null;
  const data = pixabayResponse.parse(
    await getJson(
      withParams("https://pixabay.com/api/", { key: apiKey, id: sourceId }),
    ),
  );
  return data.hits[0]?.largeImageURL ?? null;
}

export async function triggerUnsplashDownload(downloadLocation: string) {
  const apiKey = await getOptionalEnvValue("UNSPLASH_ACCESS_KEY");
  if (!apiKey) return;
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return;
  }
}
