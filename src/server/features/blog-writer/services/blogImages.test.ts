import { describe, expect, it } from "vitest";
import {
  imageFileBase,
  imagesCsv,
  isAllowedImageHost,
  uniqueFileName,
} from "@/server/features/blog-writer/services/imageZip";
import {
  parseProductSitemap,
  parseSitemapIndex,
  rankProducts,
  sizedImageUrl,
} from "@/server/features/blog-writer/services/productImages";

const PRODUCT_SITEMAP = `<?xml version="1.0"?>
<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>https://shop.com/</loc></url>
  <url>
    <loc>https://shop.com/products/large-jute-tote</loc>
    <image:image>
      <image:loc>https://cdn.shopify.com/s/files/1/jute.jpg?v=1</image:loc>
      <image:title>Large Jute Tote &amp; Shopper</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://shop.com/products/cotton-wine-bag</loc>
    <image:image><image:loc>https://cdn.shopify.com/s/files/1/wine.jpg</image:loc></image:image>
  </url>
  <url><loc>https://shop.com/products/no-image</loc></url>
</urlset>`;

describe("product sitemap parsing", () => {
  it("reads product URLs, first image and title", () => {
    const products = parseProductSitemap(PRODUCT_SITEMAP);
    expect(products).toHaveLength(2);
    expect(products[0]).toEqual({
      url: "https://shop.com/products/large-jute-tote",
      imageUrl: "https://cdn.shopify.com/s/files/1/jute.jpg?v=1&width=1600",
      title: "Large Jute Tote & Shopper",
    });
    expect(products[1]?.title).toBe("cotton wine bag");
  });

  it("lists child sitemaps from an index", () => {
    const index = `<sitemapindex><sitemap><loc>https://shop.com/sitemap_products_1.xml?from=1&amp;to=9</loc></sitemap></sitemapindex>`;
    expect(parseSitemapIndex(index)).toEqual([
      "https://shop.com/sitemap_products_1.xml?from=1&to=9",
    ]);
  });

  it("ranks products by topic and drops unrelated ones", () => {
    const ranked = rankProducts(
      parseProductSitemap(PRODUCT_SITEMAP),
      "wine gift bag",
      5,
    );
    expect(ranked.map((product) => product.url)).toEqual([
      "https://shop.com/products/cotton-wine-bag",
    ]);
  });

  it("normalizes protocol-relative image URLs", () => {
    expect(sizedImageUrl("//shop.com/cdn/shop/files/a.jpg")).toBe(
      "https://shop.com/cdn/shop/files/a.jpg?width=1600",
    );
  });
});

describe("image zip helpers", () => {
  it("names files after alt text and keeps them unique", () => {
    const used = new Set<string>();
    const base = imageFileBase(
      "Reusable grocery tote with Thanksgiving produce",
      0,
    );
    expect(uniqueFileName(base, "jpg", used)).toBe(
      "reusable-grocery-tote-with-thanksgiving-produce.jpg",
    );
    expect(uniqueFileName(base, "jpg", used)).toBe(
      "reusable-grocery-tote-with-thanksgiving-produce-2.jpg",
    );
    expect(imageFileBase("!!!", 4)).toBe("image-5");
  });

  it("only allows known image hosts and the project's site", () => {
    expect(
      isAllowedImageHost("https://images.pexels.com/x.jpg", "shop.com"),
    ).toBe(true);
    expect(
      isAllowedImageHost("https://www.shop.com/cdn/x.jpg", "shop.com"),
    ).toBe(true);
    expect(isAllowedImageHost("https://evil.com/x.jpg", "shop.com")).toBe(
      false,
    );
    expect(
      isAllowedImageHost("http://images.pexels.com/x.jpg", "shop.com"),
    ).toBe(false);
  });

  it("writes a CSV with quoted cells", () => {
    const csv = imagesCsv([
      {
        fileName: "a.jpg",
        image: { alt: 'Tote, "jute"', placement: "Intro", source: "pexels" },
      },
    ]);
    expect(csv.split("\n")[1]).toBe('a.jpg,"Tote, ""jute""",Intro,pexels,,,,');
  });
});
