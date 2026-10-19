/**
 * The step-by-step workflow an MCP agent follows to write a blog post with the
 * user. Returned by start_blog_post so every client (claude.ai, Claude Code,
 * Codex) gets the same process without installing a skill.
 */
export const BLOG_WRITER_WORKFLOW = `# MericSEO blog writing workflow

Talk to the user in the language they write to you in. Write the article in the project's language unless the user asks otherwise. Work one step at a time and WAIT for the user's choice before moving on. Never invent search volumes, rankings or statistics: every number you show must come from a MericSEO tool result.

## Step 1 — Keyword
Build 8–10 candidate target keywords from the data below and from tools:
- Striking-distance queries (Search Console, position 5–20): the fastest wins. Prefer queries whose current page is NOT a dedicated article.
- Saved keywords with their volume and difficulty.
- If the user gives a topic or seed, call research_keywords for it (it uses credits — say so once) in the project's market.
For each candidate show: keyword, monthly volume, difficulty, intent, and why (e.g. "the site ranks #11 for it", "low difficulty, commercial intent"). Mark any candidate that an existing post or draft already targets as a cannibalization risk and do not recommend it. Let the user pick one primary keyword and suggest 3–6 secondary keywords that share the intent.

## Step 2 — SERP analysis
Call get_serp_results for the chosen keyword (small credit cost). Summarize: search intent, the content format that ranks (guide, list, comparison…), typical length and the H2 topics competitors cover, People Also Ask questions, and the gap this post can fill. Keep it short.

## Step 3 — Title
Offer 5 titles (under 60 characters where possible, primary keyword near the start, no clickbait). Mark your recommendation. Wait for the user's pick or edit.

## Step 4 — Internal links
Call get_site_link_targets with the keyword as topic. Propose 3–6 links: at least one category/collection page the article should send readers to (the commercial goal), plus relevant pages or existing blog posts. Show the URL and the anchor text you plan to use. Let the user confirm or change them. Only link to URLs returned by the tool.

## Step 5 — Outline
Show the H2/H3 outline, the planned word count (match what ranks, usually 1,200–2,000 words), where each internal link goes, and 4–6 FAQ questions (use People Also Ask). Wait for approval.

## Step 6 — Write and save
Write the article as clean HTML and call save_blog_draft. Rules:
- No <h1> (the CMS renders the title). Use <h2>/<h3>, <p>, <ul>/<ol>, <table>, <strong>, <a>. No inline styles, classes or scripts.
- Answer the search intent in the first 2–3 sentences (an "answer-first" summary AI search engines can quote). Use the primary keyword naturally in the first 100 words and in at least one H2; never stuff it.
- Short paragraphs, descriptive subheadings, lists and a comparison table where they genuinely help. Concrete, experience-based advice in the brand's voice from the project context.
- Place the confirmed internal links with their anchors where they help the reader. End with a short call to action toward the main category.
- Link the site's homepage twice: once in the introduction and once in the conclusion, with natural anchor text that fits the sentence.
- Add 3–6 external links to official, authoritative sources (standards bodies, government agencies, regulators, carriers, original research) inline where a fact is stated, with target="_blank" rel="noopener". Never link to competitors. Open every external URL before using it and only keep the ones that load.
- End contentHtml with a "Sources" H2 listing every external source used for facts, as links.
- Follow the project's writing preferences; they override these defaults.
- Do NOT put the FAQ inside contentHtml: pass it in \`faqs\`; MericSEO renders it and builds the FAQ schema.
- Also pass metaTitle (≤60 chars), metaDescription (≤155 chars, includes the keyword and a reason to click), slug (short, keyword-based, lowercase, hyphens, ASCII), excerpt (1–2 sentences), secondaryKeywords, internalLinks you used, 3–5 imageSuggestions (placement + descriptive alt text), and researchNotes (the keyword data and SERP findings that justified the choices).
After saving, give the user the MericSEO link from the tool result, where they can preview it and copy the HTML.

## Rewrites of existing posts
Ask the user to paste the post's current HTML (Shopify: Show HTML) and keep the original text word for word. Add the new sections, update title, meta, links and image alt text, keep the same slug, and apply the same link and Sources rules.

## Revisions
For changes, call get_blog_draft, edit, and call save_blog_draft with the same draftId.`;
