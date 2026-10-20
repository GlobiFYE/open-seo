import { describe, expect, it } from "vitest";
import {
  buildPublishHtml,
  countWords,
  placeBodyImages,
  sanitizeBlogHtml,
  slugify,
} from "@/server/features/blog-writer/services/blogHtml";

describe("sanitizeBlogHtml", () => {
  it("keeps content tags and drops scripts, styles, handlers and h1", () => {
    const html = sanitizeBlogHtml(
      '<h1 class="x">Title</h1><p onclick="x()" style="color:red">Hi <a href="javascript:alert(1)">bad</a> <a href="/collections/bags" target="_blank">bags</a></p><script>alert(1)</script><style>p{}</style>',
    );
    expect(html).toBe(
      '<h2>Title</h2>\n<p>Hi <a>bad</a> <a href="/collections/bags" target="_blank" rel="noopener">bags</a></p>',
    );
  });

  it("escapes text and closes unclosed tags", () => {
    expect(sanitizeBlogHtml("<ul><li>a < b &amp; c")).toBe(
      "<ul><li>a &lt; b &amp; c</li>\n</ul>",
    );
  });
});

describe("buildPublishHtml", () => {
  it("appends a visible FAQ and matching FAQPage schema", () => {
    const html = buildPublishHtml(
      "<p>Body</p>",
      [{ question: "Q?", answer: "A." }],
      "SSS",
    );
    expect(html).toContain("<h2>SSS</h2>");
    expect(html).toContain("<h3>Q?</h3>");
    expect(html).toContain('"@type": "FAQPage"');
  });
});

describe("placeBodyImages", () => {
  const post =
    "<h2>Bring your own bags</h2>\n<p>Intro.</p>\n<p>More.</p>\n<h2>Leftovers</h2>\n<p>Jars.</p>";
  const photo = {
    placement: "Leftovers",
    alt: "Glass jars of cranberry sauce",
    source: "unsplash" as const,
    url: "https://images.unsplash.com/jar?w=1600&q=80",
    credit: "Ella on Unsplash",
    creditUrl: "https://unsplash.com/@ella",
    width: 4000,
    height: 3000,
    inBody: true,
  };
  const product = {
    placement: "bring your own bags",
    alt: "Large reusable grocery bag",
    source: "product" as const,
    url: "https://shop.com/cdn/bag.jpg",
    productUrl: "https://shop.com/products/bag",
    inBody: true,
  };

  it("places inBody images after the first paragraph of their heading", () => {
    const { html, unmatched } = placeBodyImages(
      post,
      [photo, product, { ...photo, placement: "Nowhere", inBody: false }],
      [],
    );
    expect(unmatched).toEqual([]);
    expect(html).toBe(
      [
        "<h2>Bring your own bags</h2>",
        "<p>Intro.</p>",
        '<figure><a href="https://shop.com/products/bag"><img src="https://shop.com/cdn/bag.jpg" alt="Large reusable grocery bag" loading="lazy"></a></figure>',
        "<p>More.</p>",
        "<h2>Leftovers</h2>",
        "<p>Jars.</p>",
        '<figure><img src="https://images.unsplash.com/jar?w=1600&amp;q=80" alt="Glass jars of cranberry sauce" width="1600" height="1200" loading="lazy"><figcaption><a href="https://unsplash.com/@ella" target="_blank" rel="noopener">Ella on Unsplash</a></figcaption></figure>',
      ].join("\n"),
    );
  });

  it("re-places its own images without duplicates and keeps hand-written ones", () => {
    const handWritten =
      '<figure><img src="https://shop.com/cdn/mine.jpg" alt="Mine"></figure>';
    const first = placeBodyImages(`${post}\n${handWritten}`, [photo], []);
    const second = placeBodyImages(first.html, [photo], [photo]);
    expect(second.html).toBe(first.html);
    expect(second.html).toContain("mine.jpg");
    expect(
      placeBodyImages(post, [{ ...photo, placement: "Nope" }], []).unmatched,
    ).toEqual(["Nope"]);
  });
});

describe("slugify and countWords", () => {
  it("transliterates Turkish characters", () => {
    expect(slugify("Kurumsal Hediye İçin Bez Çanta Seçimi")).toBe(
      "kurumsal-hediye-icin-bez-canta-secimi",
    );
  });

  it("counts words without markup", () => {
    expect(countWords("<h2>İki kelime</h2><p>ve üç &amp; daha</p>")).toBe(5);
  });
});
