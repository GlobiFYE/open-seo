import { Parser } from "htmlparser2";
import type { BlogImageSuggestion } from "@/types/schemas/blog-writer";

const ALLOWED_TAGS = new Set([
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "a",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
  "hr",
  "img",
  "figure",
  "figcaption",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);
const BLOCK_END =
  /<\/(h2|h3|h4|p|ul|ol|li|table|thead|tbody|tr|blockquote|figure)>|<hr>/g;
const DROPPED_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "template",
  "svg",
  "math",
  "head",
  "title",
]);
const RENAMED_TAGS: Record<string, string> = { h1: "h2", h5: "h4", h6: "h4" };

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
};

export type BlogFaq = { question: string; answer: string };

function escapeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function isSafeUrl(value: string, allowRelative: boolean) {
  const trimmed = value.trim();
  if (allowRelative && /^(\/(?!\/)|#)/.test(trimmed)) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeAttributes(tag: string, attributes: Record<string, string>) {
  const allowed = ALLOWED_ATTRIBUTES[tag];
  if (!allowed) return "";
  const parts: string[] = [];
  for (const [name, value] of Object.entries(attributes)) {
    const key = name.toLowerCase();
    if (!allowed.has(key)) continue;
    if ((key === "href" || key === "src") && !isSafeUrl(value, true)) continue;
    if (key === "target" && value !== "_blank") continue;
    parts.push(`${key}="${escapeAttribute(value)}"`);
  }
  if (tag === "a" && attributes.target === "_blank" && !attributes.rel) {
    parts.push('rel="noopener"');
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

/**
 * Reduce model-written HTML to the subset a Shopify (or any CMS) blog body
 * accepts: content tags only, no scripts, styles or event handlers, and no H1
 * because the CMS renders the post title as the page heading.
 */
export function sanitizeBlogHtml(html: string): string {
  const output: string[] = [];
  const openTags: string[] = [];
  let droppedDepth = 0;

  const parser = new Parser(
    {
      onopentag(rawName, attributes) {
        const name = rawName.toLowerCase();
        if (droppedDepth > 0 || DROPPED_WITH_CONTENT.has(name)) {
          droppedDepth += 1;
          return;
        }
        const tag = RENAMED_TAGS[name] ?? name;
        if (!ALLOWED_TAGS.has(tag)) return;
        output.push(`<${tag}${sanitizeAttributes(tag, attributes)}>`);
        if (!VOID_TAGS.has(tag)) openTags.push(tag);
      },
      ontext(text) {
        if (droppedDepth > 0) return;
        output.push(escapeText(text));
      },
      onclosetag(rawName, isImplied) {
        const name = rawName.toLowerCase();
        if (droppedDepth > 0) {
          droppedDepth -= 1;
          return;
        }
        const tag = RENAMED_TAGS[name] ?? name;
        if (!ALLOWED_TAGS.has(tag) || VOID_TAGS.has(tag)) return;
        const index = openTags.lastIndexOf(tag);
        if (index === -1) return;
        while (openTags.length > index) {
          output.push(`</${openTags.pop()}>`);
        }
        void isImplied;
      },
    },
    { decodeEntities: true, lowerCaseTags: true },
  );
  parser.write(html);
  parser.end();
  while (openTags.length > 0) output.push(`</${openTags.pop()}>`);

  return output
    .join("")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(BLOCK_END, "$&\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

function faqHtml(faqs: BlogFaq[], heading: string) {
  return [
    `<h2>${escapeText(heading)}</h2>`,
    ...faqs.map(
      (faq) =>
        `<h3>${escapeText(faq.question)}</h3>\n<p>${escapeText(faq.answer)}</p>`,
    ),
  ].join("\n");
}

export function buildFaqSchema(faqs: BlogFaq[]) {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    null,
    2,
  );
}

/**
 * The paste-ready body: the article, the FAQ as visible content (Google only
 * honors FAQ markup that matches what readers see), then the JSON-LD block.
 */
export function buildPublishHtml(
  contentHtml: string,
  faqs: BlogFaq[],
  faqHeading: string,
) {
  if (faqs.length === 0) return contentHtml;
  return [
    contentHtml,
    faqHtml(faqs, faqHeading),
    `<script type="application/ld+json">\n${buildFaqSchema(faqs)}\n</script>`,
  ].join("\n\n");
}

const MAX_BODY_IMAGE_WIDTH = 1600;
const FIGURE_BLOCK = /<figure>[\s\S]*?<\/figure>\n?/g;
const HEADING_BLOCK = /<(h2|h3)>([\s\S]*?)<\/\1>\n?/g;

function normalizeHeading(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function bodyFigureHtml(image: BlogImageSuggestion) {
  const attributes = [
    `src="${escapeAttribute(image.url ?? "")}"`,
    `alt="${escapeAttribute(image.alt)}"`,
  ];
  if (image.width && image.height) {
    const width = Math.min(image.width, MAX_BODY_IMAGE_WIDTH);
    const height = Math.round((image.height * width) / image.width);
    attributes.push(`width="${width}"`, `height="${height}"`);
  }
  attributes.push('loading="lazy"');
  const img = `<img ${attributes.join(" ")}>`;
  if (image.source === "product" && image.productUrl) {
    return `<figure><a href="${escapeAttribute(image.productUrl)}">${img}</a></figure>`;
  }
  const creditHref = image.creditUrl ?? image.pageUrl;
  const caption = image.credit
    ? creditHref
      ? `<figcaption><a href="${escapeAttribute(creditHref)}" target="_blank" rel="noopener">${escapeText(image.credit)}</a></figcaption>`
      : `<figcaption>${escapeText(image.credit)}</figcaption>`
    : "";
  return `<figure>${img}${caption}</figure>`;
}

function findHeadingEnd(html: string, placement: string) {
  const target = normalizeHeading(placement);
  if (!target) return undefined;
  const headings = [...html.matchAll(HEADING_BLOCK)].map((match) => ({
    text: normalizeHeading(match[2] ?? ""),
    end: (match.index ?? 0) + match[0].length,
  }));
  const exact = headings.find((heading) => heading.text === target);
  if (exact) return exact.end;
  return headings.find(
    (heading) =>
      heading.text.length >= 4 &&
      (target.includes(heading.text) || heading.text.includes(target)),
  )?.end;
}

function afterFirstParagraph(html: string, start: number) {
  const paragraph = /^\s*<p>[\s\S]*?<\/p>\n?/.exec(html.slice(start));
  return paragraph ? start + paragraph[0].length : start;
}

export function placeBodyImages(
  html: string,
  images: BlogImageSuggestion[],
  previousImages: BlogImageSuggestion[],
) {
  const previousSources = previousImages
    .filter((image) => image.inBody && image.url)
    .map((image) => `src="${escapeAttribute(image.url ?? "")}"`);
  const cleaned = html.replace(FIGURE_BLOCK, (figure) =>
    previousSources.some((source) => figure.includes(source)) ? "" : figure,
  );

  const insertions = new Map<number, string[]>();
  const unmatched: string[] = [];
  for (const image of images) {
    if (!image.inBody || !image.url) continue;
    const headingEnd = findHeadingEnd(cleaned, image.placement);
    if (headingEnd === undefined) {
      unmatched.push(image.placement);
      continue;
    }
    const position = afterFirstParagraph(cleaned, headingEnd);
    insertions.set(position, [
      ...(insertions.get(position) ?? []),
      bodyFigureHtml(image),
    ]);
  }

  let output = "";
  let last = 0;
  for (const match of cleaned.matchAll(HEADING_BLOCK)) {
    const position = afterFirstParagraph(
      cleaned,
      (match.index ?? 0) + match[0].length,
    );
    const figures = insertions.get(position);
    if (!figures || position < last) continue;
    output += `${cleaned.slice(last, position)}${figures.join("\n")}\n`;
    last = position;
  }
  output += cleaned.slice(last);
  return { html: sanitizeBlogHtml(output), unmatched };
}

export function slugify(value: string) {
  const map: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    i̇: "i",
    ö: "o",
    ş: "s",
    ü: "u",
  };
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]|i̇/g, (char) => map[char] ?? char)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
