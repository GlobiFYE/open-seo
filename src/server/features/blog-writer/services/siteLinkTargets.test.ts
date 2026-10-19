import { describe, expect, it } from "vitest";
import { groupLinkTargets } from "@/server/features/blog-writer/services/siteLinkTargets";

describe("groupLinkTargets", () => {
  it("groups Shopify URLs and ranks categories by topic", () => {
    const groups = groupLinkTargets(
      [
        "https://shop.com/",
        "https://shop.com/collections/all",
        "https://shop.com/collections/wedding-flowers",
        "https://shop.com/collections/tote-bags",
        "https://shop.com/products/canvas-tote",
        "https://shop.com/blogs/news/how-to-pick-a-tote",
        "https://shop.com/pages/about",
        "https://shop.com/cart",
      ],
      "custom tote bags",
    );
    expect(groups.categories.map((item) => item.url)).toEqual([
      "https://shop.com/collections/tote-bags",
      "https://shop.com/collections/wedding-flowers",
    ]);
    expect(groups.products).toHaveLength(1);
    expect(groups.blogPosts).toHaveLength(1);
    expect(groups.pages.map((item) => item.label)).toEqual(["about"]);
  });
});
