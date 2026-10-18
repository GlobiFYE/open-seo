import { describe, expect, it } from "vitest";
import {
  buildBlogPostRows,
  suggestBlogPages,
} from "@/server/features/blog-tracking/services/blogTrackingReport";

const today = new Date("2026-10-18T00:00:00Z");

const post = (
  overrides: Partial<Parameters<typeof buildBlogPostRows>[0][number]> = {},
) => ({
  id: "post-1",
  url: "https://shop.com/blogs/news/guide",
  title: null,
  targetKeyword: null,
  publishedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const pageRow = (page: string, clicks: number, impressions = clicks * 20) => ({
  keys: [page],
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position: 8,
});

describe("buildBlogPostRows", () => {
  it("matches GSC pages regardless of www and trailing slash", () => {
    const [row] = buildBlogPostRows(
      [post()],
      {
        currentPages: [pageRow("https://www.shop.com/blogs/news/guide/", 40)],
        previousPages: [pageRow("https://shop.com/blogs/news/guide", 40)],
        queryPages: [],
      },
      today,
    );
    expect(row?.current?.clicks).toBe(40);
    expect(row?.status).toBe("stable");
  });

  it("flags posts whose clicks dropped as declining", () => {
    const [row] = buildBlogPostRows(
      [post()],
      {
        currentPages: [pageRow("https://shop.com/blogs/news/guide", 10)],
        previousPages: [pageRow("https://shop.com/blogs/news/guide", 50)],
        queryPages: [],
      },
      today,
    );
    expect(row?.status).toBe("declining");
    expect(row?.clicksChange).toBeCloseTo(-0.8);
  });

  it("keeps recently published posts as new and reads the target keyword position", () => {
    const [row] = buildBlogPostRows(
      [post({ publishedAt: "2026-10-10", targetKeyword: "Tote Bags" })],
      {
        currentPages: [],
        previousPages: [],
        queryPages: [
          {
            keys: ["tote bags", "https://shop.com/blogs/news/guide"],
            clicks: 1,
            impressions: 30,
            ctr: 0.03,
            position: 12.4,
          },
        ],
      },
      today,
    );
    expect(row?.status).toBe("new");
    expect(row?.targetKeywordPosition).toBe(12.4);
  });
});

describe("suggestBlogPages", () => {
  it("suggests untracked blog pages only", () => {
    const suggestions = suggestBlogPages(
      [
        pageRow("https://shop.com/blogs/news/guide", 30),
        pageRow("https://shop.com/blogs/news/other", 20),
        pageRow("https://shop.com/products/bag", 90),
      ],
      ["https://shop.com/blogs/news/guide"],
    );
    expect(suggestions.map((item) => item.url)).toEqual([
      "https://shop.com/blogs/news/other",
    ]);
  });
});
