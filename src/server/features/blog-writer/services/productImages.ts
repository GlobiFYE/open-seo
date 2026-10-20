import { sort } from "remeda";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import {
  relevanceFor,
  tokens,
} from "@/server/features/blog-writer/services/siteLinkTargets";
import type { ImageCandidate } from "@/server/features/blog-writer/services/stockImages";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_PRODUCT_SITEMAPS = 3;
const MAX_HTML_BYTES = 400_000;
const PRODUCT_IMAGE_WIDTH = "1600";

type SitemapProduct = {
  url: string;
  imageUrl: string;
  title: string;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function firstTag(block: string, tag: string) {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return match?.[1] ? decodeXml(match[1]) : null;
}

function handleLabel(url: string) {
  const last = new URL(url).pathname.replace(/\/+$/, "").split("/").pop();
  return (last ?? "").replace(/[-_]+/g, " ");
}

export function sizedImageUrl(raw: string) {
  const absolute = raw.startsWith("//") ? `https:${raw}` : raw;
  try {
    const url = new URL(absolute);
    url.protocol = "https:";
    if (
      url.hostname.endsWith("cdn.shopify.com") ||
      url.pathname.includes("/cdn/shop/")
    )
      url.searchParams.set("width", PRODUCT_IMAGE_WIDTH);
    return url.toString();
  } catch {
    return null;
  }
}

export function parseProductSitemap(xml: string): SitemapProduct[] {
  const products: SitemapProduct[] = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const block = match[1] ?? "";
    const url = firstTag(block, "loc");
    const image = firstTag(block, "image:loc");
    if (!url || !image || !/\/products?\//i.test(url)) continue;
    const imageUrl = sizedImageUrl(image);
    if (!imageUrl) continue;
    products.push({
      url,
      imageUrl,
      title: firstTag(block, "image:title") ?? handleLabel(url),
    });
  }
  return products;
}

export function parseSitemapIndex(xml: string) {
  return [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeXml(match[1] ?? ""))
    .filter(Boolean);
}

async function fetchText(url: string, maxBytes?: number) {
  const response = await fetch(url, {
    headers: { "User-Agent": "MericSEO-BlogWriter/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return maxBytes ? text.slice(0, maxBytes) : text;
}

function bareHost(value: string) {
  return new URL(value).hostname.replace(/^www\./, "");
}

function sameSite(url: string, origin: string) {
  try {
    return bareHost(url) === bareHost(origin);
  } catch {
    return false;
  }
}

export async function projectOrigin(domain: string) {
  return new URL(await normalizeAndValidateStartUrl(domain)).origin;
}

async function loadSitemapProducts(origin: string) {
  const root = await fetchText(`${origin}/sitemap.xml`);
  const direct = parseProductSitemap(root);
  if (direct.length > 0) return direct;
  const productSitemaps = parseSitemapIndex(root)
    .filter((loc) => /product/i.test(loc) && sameSite(loc, origin))
    .slice(0, MAX_PRODUCT_SITEMAPS);
  const pages = await Promise.all(
    productSitemaps.map((loc) => fetchText(loc).catch(() => "")),
  );
  return pages.flatMap(parseProductSitemap);
}

export function rankProducts(
  products: SitemapProduct[],
  topic: string,
  limit: number,
) {
  const topicTokens = tokens(topic);
  const scored = products
    .map((product, index) => ({
      product,
      index,
      score: relevanceFor(
        `${product.title} ${handleLabel(product.url)}`,
        topicTokens,
      ),
    }))
    .filter((entry) => entry.score > 0);
  return sort(scored, (a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.product);
}

function metaContent(html: string, property: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return decodeXml(match[1]);
  }
  return null;
}

async function loadProductPage(url: string): Promise<SitemapProduct | null> {
  const html = await fetchText(url, MAX_HTML_BYTES);
  const image =
    metaContent(html, "og:image:secure_url") ?? metaContent(html, "og:image");
  const imageUrl = image ? sizedImageUrl(image) : null;
  if (!imageUrl) return null;
  return {
    url,
    imageUrl,
    title: metaContent(html, "og:title") ?? handleLabel(url),
  };
}

function toCandidate(product: SitemapProduct): ImageCandidate {
  return {
    candidateId: `product:${product.url}`,
    source: "product",
    sourceId: product.url,
    url: product.imageUrl,
    previewUrl: product.imageUrl,
    pageUrl: product.url,
    description: product.title,
    credit: new URL(product.url).hostname.replace(/^www\./, ""),
    productUrl: product.url,
    productTitle: product.title,
  };
}

export async function findProductImages(options: {
  domain: string;
  topic: string;
  productUrls: string[];
  limit: number;
}) {
  const origin = await projectOrigin(options.domain);
  const errors: string[] = [];
  const requested = options.productUrls.filter((url) => {
    const ok = sameSite(url, origin);
    if (!ok) errors.push(`${url}: not on ${origin}`);
    return ok;
  });
  const [explicit, sitemap] = await Promise.all([
    Promise.all(
      requested.map((url) =>
        loadProductPage(url).catch((error: unknown) => {
          errors.push(
            `${url}: ${error instanceof Error ? error.message : "failed"}`,
          );
          return null;
        }),
      ),
    ),
    loadSitemapProducts(origin).catch((error: unknown) => {
      errors.push(
        `sitemap: ${error instanceof Error ? error.message : "failed"}`,
      );
      return [];
    }),
  ]);
  const seen = new Set<string>();
  const products = [
    ...explicit.filter((item): item is SitemapProduct => item !== null),
    ...rankProducts(sitemap, options.topic, options.limit),
  ].filter((product) => {
    if (seen.has(product.url)) return false;
    seen.add(product.url);
    return true;
  });
  return { origin, images: products.map(toCandidate), errors };
}
