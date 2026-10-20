import { strToU8, zipSync, type Zippable } from "fflate";
import { slugify } from "@/server/features/blog-writer/services/blogHtml";
import {
  refreshPixabayUrl,
  triggerUnsplashDownload,
} from "@/server/features/blog-writer/services/stockImages";
import type { BlogImageSuggestion } from "@/types/schemas/blog-writer";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const STOCK_HOSTS = [
  "images.pexels.com",
  "images.unsplash.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "cdn.shopify.com",
];
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function imageFileBase(alt: string, index: number) {
  return slugify(alt) || `image-${index + 1}`;
}

export function uniqueFileName(base: string, ext: string, used: Set<string>) {
  let name = `${base}.${ext}`;
  for (let n = 2; used.has(name); n += 1) name = `${base}-${n}.${ext}`;
  used.add(name);
  return name;
}

export function isAllowedImageHost(url: string, siteHost: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.replace(/^www\./, "");
    return STOCK_HOSTS.includes(host) || host === siteHost;
  } catch {
    return false;
  }
}

function csvCell(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function imagesCsv(
  rows: Array<{ fileName: string; image: BlogImageSuggestion }>,
) {
  const header = [
    "file_name",
    "alt_text",
    "placement",
    "source",
    "image_url",
    "source_page",
    "credit",
    "product_url",
  ];
  const lines = rows.map(({ fileName, image }) =>
    [
      fileName,
      image.alt,
      image.placement,
      image.source,
      image.url,
      image.pageUrl,
      image.credit,
      image.productUrl,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

async function fetchImage(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  const ext = type ? EXTENSIONS[type] : undefined;
  if (!ext) throw new Error(`not an image (${type || "unknown type"})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("file too large");
  return { bytes, ext };
}

async function downloadOne(image: BlogImageSuggestion, siteHost: string) {
  const url = image.url;
  if (!url) throw new Error("no image URL");
  if (!isAllowedImageHost(url, siteHost)) throw new Error("host not allowed");
  try {
    return await fetchImage(url);
  } catch (error) {
    if (image.source !== "pixabay" || !image.sourceId) throw error;
    const fresh = await refreshPixabayUrl(image.sourceId);
    if (!fresh || !isAllowedImageHost(fresh, siteHost)) throw error;
    return fetchImage(fresh);
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export async function buildImageZip(
  images: BlogImageSuggestion[],
  siteHost: string,
) {
  const results = await Promise.all(
    images.map(async (image) => {
      try {
        const file = await downloadOne(image, siteHost);
        if (
          image.source === "unsplash" &&
          image.downloadLocation?.startsWith("https://api.unsplash.com/")
        )
          await triggerUnsplashDownload(image.downloadLocation);
        return { image, file };
      } catch (error) {
        return {
          image,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    }),
  );
  const used = new Set<string>();
  const files: Zippable = {};
  const rows: Array<{ fileName: string; image: BlogImageSuggestion }> = [];
  const skipped: string[] = [];
  results.forEach((result, index) => {
    if (!("file" in result) || !result.file) {
      skipped.push(`${result.image.alt}: ${result.error ?? "failed"}`);
      return;
    }
    const fileName = uniqueFileName(
      imageFileBase(result.image.alt, index),
      result.file.ext,
      used,
    );
    files[fileName] = [result.file.bytes, { level: 0 }];
    rows.push({ fileName, image: result.image });
  });
  files["images.csv"] = strToU8(imagesCsv(rows));
  return {
    base64: toBase64(zipSync(files)),
    fileCount: rows.length,
    skipped,
  };
}
