import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { BlogDraftRepository } from "@/server/features/blog-writer/repositories/BlogDraftRepository";
import {
  countWords,
  placeBodyImages,
  slugify,
} from "@/server/features/blog-writer/services/blogHtml";
import {
  buildImageZip,
  isAllowedImageHost,
} from "@/server/features/blog-writer/services/imageZip";
import {
  findProductImages,
  projectOrigin,
} from "@/server/features/blog-writer/services/productImages";
import { searchStockImages } from "@/server/features/blog-writer/services/stockImages";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import {
  blogImageSuggestionSchema,
  type BlogImageSuggestion,
} from "@/types/schemas/blog-writer";

async function requireDomain(projectId: string) {
  const project = await ProjectRepository.getProjectById(projectId);
  if (!project) throw new AppError("NOT_FOUND");
  if (!project.domain) throw new AppError("VALIDATION_ERROR");
  return project.domain;
}

async function siteHostFor(projectId: string) {
  const origin = await projectOrigin(await requireDomain(projectId));
  return new URL(origin).hostname.replace(/^www\./, "");
}

function parseImages(json: string | null): BlogImageSuggestion[] {
  if (!json) return [];
  try {
    const parsed = z
      .array(blogImageSuggestionSchema)
      .safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

async function findImages(
  projectId: string,
  options: {
    queries: string[];
    topic?: string;
    productUrls: string[];
    perQuery: number;
    productLimit: number;
  },
) {
  const domain = await requireDomain(projectId);
  const [stock, products] = await Promise.all([
    searchStockImages(options.queries, options.perQuery),
    findProductImages({
      domain,
      topic: options.topic ?? options.queries.join(" "),
      productUrls: options.productUrls,
      limit: options.productLimit,
    }),
  ]);
  return {
    stock: stock.images,
    products: products.images,
    sources: stock.sources,
    missingSources: stock.missingSources,
    errors: [...stock.errors, ...products.errors],
  };
}

async function saveImages(
  projectId: string,
  draftId: string,
  images: BlogImageSuggestion[],
) {
  const draft = await BlogDraftRepository.get(projectId, draftId);
  if (!draft) throw new AppError("NOT_FOUND");
  const siteHost = await siteHostFor(projectId);
  const rejected = images.filter(
    (image) => image.url && !isAllowedImageHost(image.url, siteHost),
  );
  if (rejected.length > 0)
    throw new AppError(
      "VALIDATION_ERROR",
      `Image URLs must come from find_blog_images: ${rejected.map((image) => image.url).join(", ")}`,
    );
  const placed = placeBodyImages(
    draft.contentHtml,
    images,
    parseImages(draft.imageSuggestionsJson),
  );
  if (placed.unmatched.length > 0)
    throw new AppError(
      "VALIDATION_ERROR",
      `No H2/H3 in the post matches these inBody placements: ${placed.unmatched.join(", ")}. Use the exact heading text.`,
    );
  await BlogDraftRepository.update(projectId, draftId, {
    contentHtml: placed.html,
    wordCount: countWords(placed.html),
    imageSuggestionsJson: images.length > 0 ? JSON.stringify(images) : null,
    updatedBy: "mcp",
  });
  return {
    saved: images.length,
    products: images.filter((image) => image.source === "product").length,
    inBody: images.filter((image) => image.inBody).length,
  };
}

async function downloadImages(
  projectId: string,
  draftId: string,
  indexes?: number[],
) {
  const draft = await BlogDraftRepository.get(projectId, draftId);
  if (!draft) throw new AppError("NOT_FOUND");
  const all = parseImages(draft.imageSuggestionsJson);
  const chosen = (indexes ? indexes.map((index) => all[index]) : all).filter(
    (image): image is BlogImageSuggestion => Boolean(image?.url),
  );
  if (chosen.length === 0)
    throw new AppError("VALIDATION_ERROR", "No downloadable images");
  const zip = await buildImageZip(chosen, await siteHostFor(projectId));
  return {
    fileName: `${slugify(draft.slug ?? draft.title) || "blog"}-images.zip`,
    ...zip,
  };
}

export const BlogImageService = { findImages, saveImages, downloadImages };
