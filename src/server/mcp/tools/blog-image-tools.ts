import { z } from "zod";
import { BlogImageService } from "@/server/features/blog-writer/services/BlogImageService";
import type { ImageCandidate } from "@/server/features/blog-writer/services/stockImages";
import { buildProjectMeta } from "@/server/mcp/context";
import { mcpResponse } from "@/server/mcp/formatters";
import {
  looseObjectOutputSchema,
  optionalMetaOutputSchema,
} from "@/server/mcp/output-schemas";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { projectIdSchema } from "@/server/mcp/schemas";
import {
  BLOG_IMAGE_LIMIT,
  blogImageSuggestionSchema,
} from "@/types/schemas/blog-writer";

const writerPath = (projectId: string) => `/p/${projectId}/blog-writer`;

function candidateLine(image: ImageCandidate) {
  return JSON.stringify({
    candidateId: image.candidateId,
    source: image.source,
    sourceId: image.sourceId,
    url: image.url,
    previewUrl: image.previewUrl,
    pageUrl: image.pageUrl,
    downloadLocation: image.downloadLocation,
    credit: image.credit,
    creditUrl: image.creditUrl,
    productUrl: image.productUrl,
    productTitle: image.productTitle,
    width: image.width,
    height: image.height,
    description: image.description,
  });
}

const findInputSchema = {
  projectId: projectIdSchema,
  queries: z
    .array(z.string().trim().min(2).max(100))
    .min(1)
    .max(6)
    .describe(
      "3–6 short English photo search queries describing scenes that fit the post's sections (e.g. 'reusable grocery bag with vegetables'). Avoid brand names.",
    ),
  topic: z
    .string()
    .trim()
    .max(200)
    .optional()
    .describe("The post's keyword or topic, used to rank the site's products."),
  productUrls: z
    .array(z.string().trim().url())
    .max(10)
    .default([])
    .describe(
      "Product page URLs on the project's site you plan to recommend (from get_site_link_targets). Their main product image is returned.",
    ),
  perQuery: z.number().int().min(3).max(15).default(8),
  productLimit: z.number().int().min(0).max(20).default(8),
} as const;

export const findBlogImagesTool = {
  name: "find_blog_images",
  config: {
    title: "Find blog images",
    description:
      "Search free-license stock photos (Pexels, Unsplash, Pixabay) for a blog post and pull matching product images from the project's own site (its product sitemap plus any productUrls you pass). Returns candidates with image URL, source page and photographer credit. Pick from these for save_blog_images and for product images inside the post body. Uses no credits.",
    inputSchema: findInputSchema,
    outputSchema: z
      .object({
        stock: z.array(looseObjectOutputSchema),
        products: z.array(looseObjectOutputSchema),
        sources: z.array(z.string()),
        missingSources: z.array(z.string()),
        errors: z.array(z.string()),
        ...optionalMetaOutputSchema,
      })
      .passthrough(),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(
    async (args: z.infer<z.ZodObject<typeof findInputSchema>>, context) => {
      const result = await BlogImageService.findImages(args.projectId, args);
      const text = [
        `# Product images from the site (${result.products.length})`,
        result.products.map(candidateLine).join("\n") ||
          "None found. Pass productUrls from get_site_link_targets.",
        `# Stock photos (${result.stock.length}) from ${result.sources.join(", ") || "no source"}`,
        result.stock.map(candidateLine).join("\n") || "None found.",
        result.missingSources.length > 0
          ? `Not configured on this server (skipped): ${result.missingSources.join(", ")}`
          : "",
        result.errors.length > 0 ? `Errors: ${result.errors.join("; ")}` : "",
        "Copy the fields you use exactly into save_blog_images; never edit the URLs.",
      ]
        .filter(Boolean)
        .join("\n\n");
      return mcpResponse({
        text,
        meta: buildProjectMeta(context, args.projectId),
        structuredContent: result,
      });
    },
  ),
};

const saveInputSchema = {
  projectId: projectIdSchema,
  draftId: z.string().min(1),
  images: z
    .array(blogImageSuggestionSchema)
    .min(1)
    .max(BLOG_IMAGE_LIMIT)
    .describe(
      "The chosen images in reading order. Copy source, sourceId, url, previewUrl, pageUrl, downloadLocation, credit, creditUrl, productUrl, productTitle, width and height from find_blog_images unchanged; write alt (descriptive, keyword-aware, no 'image of') and placement (the exact H2/H3 text, or 'featured image') yourself. Set inBody: true on the images that should appear in the article; their placement must be the exact text of a heading in the post.",
    ),
} as const;

export const saveBlogImagesTool = {
  name: "save_blog_images",
  config: {
    title: "Save blog images",
    description:
      "Save the image set for a blog draft (replaces the draft's previous image suggestions). Images marked inBody are placed into the article as <figure> blocks under the first paragraph of their heading: stock photos with a linked credit caption, product images linked to the product page. Images this tool placed earlier are removed first, so calling it again re-places the set without duplicates; images written into the HTML by hand are kept. The rest stay as alternatives the user sees in MericSEO and downloads as a ZIP named by alt text. Uses no credits.",
    inputSchema: saveInputSchema,
    outputSchema: z
      .object({
        saved: z.number(),
        products: z.number(),
        inBody: z.number(),
        ...optionalMetaOutputSchema,
      })
      .passthrough(),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(
    async (args: z.infer<z.ZodObject<typeof saveInputSchema>>, context) => {
      const result = await BlogImageService.saveImages(
        args.projectId,
        args.draftId,
        args.images,
      );
      const meta = buildProjectMeta(
        context,
        args.projectId,
        writerPath(args.projectId),
        { draft: args.draftId },
      );
      return mcpResponse({
        text: `Saved ${result.saved} images (${result.products} product images); ${result.inBody} placed in the article. The user can review the post and download the images here: ${meta.url ?? writerPath(args.projectId)}`,
        meta,
        structuredContent: result,
      });
    },
  ),
};
