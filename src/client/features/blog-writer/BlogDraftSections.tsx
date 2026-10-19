import { useTranslation } from "react-i18next";
import type { BlogDraft } from "@/client/features/blog-writer/blogWriterQueries";

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string | false;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {empty ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

export function BlogDraftSections({ draft }: { draft: BlogDraft }) {
  const { t } = useTranslation("blogWriter");
  return (
    <div className="space-y-6">
      <Section title={t("detail.faq")} empty={draft.faqs.length === 0 && "–"}>
        <dl className="space-y-3">
          {draft.faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-sm font-medium">{faq.question}</dt>
              <dd className="text-sm text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section
        title={t("detail.links")}
        empty={draft.internalLinks.length === 0 && t("detail.noLinks")}
      >
        <ul className="space-y-1.5">
          {draft.internalLinks.map((link) => (
            <li key={`${link.url}-${link.anchor}`} className="text-sm">
              <span className="font-medium">{link.anchor}</span>
              <span className="text-muted-foreground"> → </span>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-muted-foreground underline underline-offset-4"
              >
                {link.url}
              </a>
            </li>
          ))}
        </ul>
      </Section>
      <Section
        title={t("detail.images")}
        empty={draft.imageSuggestions.length === 0 && t("detail.noImages")}
      >
        <ul className="space-y-2">
          {draft.imageSuggestions.map((image) => (
            <li
              key={`${image.placement}-${image.alt}`}
              className="rounded-lg border border-border p-2.5 text-sm"
            >
              <p className="text-xs text-muted-foreground">
                {t("detail.placement")}: {image.placement || "–"}
              </p>
              <p>
                <span className="font-medium">{t("detail.alt")}:</span>{" "}
                {image.alt}
              </p>
              {image.description ? (
                <p className="text-muted-foreground">{image.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
      <Section
        title={t("detail.research")}
        empty={!draft.researchNotes && t("detail.noResearch")}
      >
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {draft.researchNotes}
        </p>
      </Section>
    </div>
  );
}
