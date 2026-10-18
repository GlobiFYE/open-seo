import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  blogTrackingQueryKey,
  type BlogPostRow,
} from "@/client/features/blog-tracking/blogTrackingQueries";
import { updateBlogPost } from "@/serverFunctions/blogTracking";

export function EditBlogPostDialog({
  projectId,
  post,
  onClose,
}: {
  projectId: string;
  post: BlogPostRow;
  onClose: () => void;
}) {
  const { t } = useTranslation(["blogTracking", "common"]);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(post.title ?? "");
  const [targetKeyword, setTargetKeyword] = useState(post.targetKeyword ?? "");
  const [publishedAt, setPublishedAt] = useState(
    post.publishedAt?.slice(0, 10) ?? "",
  );

  const mutation = useMutation({
    mutationFn: () =>
      updateBlogPost({
        data: { projectId, id: post.id, title, targetKeyword, publishedAt },
      }),
    meta: { errorToast: false },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: blogTrackingQueryKey(projectId),
      });
      toast.success(t("edit.saved"));
      onClose();
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });

  return (
    <FormDialog
      title={t("edit.title")}
      onClose={onClose}
      actions={
        <>
          <Button
            variant="ghost"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("common:actions.cancel")}
          </Button>
          <Button
            pending={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t("common:actions.save")}
          </Button>
        </>
      }
    >
      <p className="truncate text-xs text-muted-foreground">{post.url}</p>
      <Field>
        <FieldLabel htmlFor="blog-post-title">
          {t("edit.titleLabel")}
        </FieldLabel>
        <Input
          id="blog-post-title"
          value={title}
          maxLength={300}
          placeholder={t("edit.titlePlaceholder")}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="blog-post-keyword">
          {t("edit.targetKeywordLabel")}
        </FieldLabel>
        <Input
          id="blog-post-keyword"
          value={targetKeyword}
          maxLength={200}
          placeholder={t("edit.targetKeywordPlaceholder")}
          onChange={(event) => setTargetKeyword(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="blog-post-published">
          {t("edit.publishedAtLabel")}
        </FieldLabel>
        <Input
          id="blog-post-published"
          type="date"
          value={publishedAt}
          onChange={(event) => setPublishedAt(event.target.value)}
        />
        <FieldDescription>{t("edit.publishedAtHint")}</FieldDescription>
      </Field>
    </FormDialog>
  );
}
