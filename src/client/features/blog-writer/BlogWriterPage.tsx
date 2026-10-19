import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FileText, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CopyButton } from "@/client/components/CopyButton";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Badge } from "@/client/components/ui/badge";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { blogDraftsOptions } from "@/client/features/blog-writer/blogWriterQueries";
import { formatRelativeTime } from "@/client/lib/relative-time";

function StartCard({ projectId }: { projectId: string }) {
  const { t } = useTranslation("blogWriter");
  const projectsQuery = useQuery(projectsQueryOptions());
  const project = projectsQuery.data?.find((item) => item.id === projectId);
  const prompt = t("start.prompt", {
    project: project?.name ?? projectId,
    projectId,
  });
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PenLine className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="font-semibold">{t("start.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("start.description")}
            </p>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-sans text-sm">
            {prompt}
          </pre>
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton
              variant="default"
              size="sm"
              value={prompt}
              label={t("start.copy")}
              successMessage={t("start.copied")}
            />
            <span className="text-xs text-muted-foreground">
              {t("start.notConnected")}{" "}
              <Link to="/ai" className="underline underline-offset-4">
                {t("start.setupLink")}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BlogWriterPage({ projectId }: { projectId: string }) {
  const { t } = useTranslation("blogWriter");
  const draftsQuery = useQuery(blogDraftsOptions(projectId));

  return (
    <div className="overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <StartCard projectId={projectId} />
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("list.title")}
          </h2>
          {draftsQuery.isPending ? (
            <SkeletonPage />
          ) : draftsQuery.isError ? (
            <QueryError
              error={draftsQuery.error}
              fallback={t("detail.loadFailed")}
              onRetry={() => void draftsQuery.refetch()}
              isRetrying={draftsQuery.isFetching}
            />
          ) : draftsQuery.data.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("list.empty")}
              description={t("list.emptyDescription")}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {draftsQuery.data.map((draft) => (
                <li key={draft.id}>
                  <Link
                    to="/p/$projectId/blog-writer"
                    params={{ projectId }}
                    search={{ draft: draft.id }}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{draft.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {draft.targetKeyword} ·{" "}
                        {t("list.words", { count: draft.wordCount })} ·{" "}
                        {t("list.updated", {
                          time: formatRelativeTime(draft.updatedAt),
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        draft.status === "published" ? "success" : "secondary"
                      }
                      className="self-start sm:self-center"
                    >
                      {t(`status.${draft.status}`)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
