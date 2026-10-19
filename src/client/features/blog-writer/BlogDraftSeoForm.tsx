import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CopyButton } from "@/client/components/CopyButton";
import { Button } from "@/client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  blogWriterQueryKey,
  type BlogDraft,
} from "@/client/features/blog-writer/blogWriterQueries";
import { updateBlogDraftMeta } from "@/serverFunctions/blogDrafts";

const META_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 155;

function CounterHint({ value, max }: { value: string; max: number }) {
  const { t } = useTranslation("blogWriter");
  return (
    <FieldDescription
      className={value.length > max ? "text-destructive" : undefined}
    >
      {t("detail.chars", { count: value.length, max })}
    </FieldDescription>
  );
}

function CopyField({ value }: { value: string }) {
  const { t } = useTranslation("blogWriter");
  return (
    <CopyButton
      size="icon-sm"
      variant="ghost"
      value={value}
      label={t("detail.copy")}
      successMessage={t("detail.copied")}
    />
  );
}

function SeoRow({
  id,
  label,
  value,
  hint,
  children,
}: {
  id: string;
  label: string;
  value: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">{children}</div>
        <CopyField value={value} />
      </div>
      {hint}
    </Field>
  );
}

export function BlogDraftSeoForm({
  projectId,
  draft,
}: {
  projectId: string;
  draft: BlogDraft;
}) {
  const { t } = useTranslation(["blogWriter", "common"]);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(draft.title);
  const [metaTitle, setMetaTitle] = useState(draft.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    draft.metaDescription ?? "",
  );
  const [slug, setSlug] = useState(draft.slug ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateBlogDraftMeta({
        data: {
          projectId,
          id: draft.id,
          title,
          metaTitle,
          metaDescription,
          slug,
        },
      }),
    meta: { errorToast: false },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: blogWriterQueryKey(projectId),
      });
      toast.success(t("detail.saved"));
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });

  return (
    <div className="space-y-4">
      <SeoRow id="draft-title" label={t("detail.postTitle")} value={title}>
        <Input
          id="draft-title"
          value={title}
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
        />
      </SeoRow>
      <SeoRow
        id="draft-meta-title"
        label={t("detail.metaTitle")}
        value={metaTitle}
        hint={<CounterHint value={metaTitle} max={META_TITLE_MAX} />}
      >
        <Input
          id="draft-meta-title"
          value={metaTitle}
          maxLength={120}
          onChange={(event) => setMetaTitle(event.target.value)}
        />
      </SeoRow>
      <SeoRow
        id="draft-meta-description"
        label={t("detail.metaDescription")}
        value={metaDescription}
        hint={
          <CounterHint value={metaDescription} max={META_DESCRIPTION_MAX} />
        }
      >
        <Textarea
          id="draft-meta-description"
          rows={3}
          value={metaDescription}
          maxLength={320}
          onChange={(event) => setMetaDescription(event.target.value)}
        />
      </SeoRow>
      <SeoRow id="draft-slug" label={t("detail.slug")} value={slug}>
        <Input
          id="draft-slug"
          value={slug}
          maxLength={120}
          className="font-mono text-xs"
          onChange={(event) => setSlug(event.target.value)}
        />
      </SeoRow>
      {draft.excerpt ? (
        <Field>
          <FieldLabel>{t("detail.excerpt")}</FieldLabel>
          <div className="flex items-start gap-1.5">
            <p className="min-w-0 flex-1 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
              {draft.excerpt}
            </p>
            <CopyField value={draft.excerpt} />
          </div>
        </Field>
      ) : null}
      <Button
        size="sm"
        pending={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {t("detail.save")}
      </Button>
    </div>
  );
}
