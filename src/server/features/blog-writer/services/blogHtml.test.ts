import { describe, expect, it } from "vitest";
import {
  buildPublishHtml,
  countWords,
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
