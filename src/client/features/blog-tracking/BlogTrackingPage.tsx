import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Newspaper, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { BlogPostTableRow } from "@/client/features/blog-tracking/BlogPostTableRow";
import { AddBlogPostsDialog } from "@/client/features/blog-tracking/AddBlogPostsDialog";
import { EditBlogPostDialog } from "@/client/features/blog-tracking/EditBlogPostDialog";
import {
  blogTrackingQueryKey,
  blogTrackingReportOptions,
  type BlogPostRow,
} from "@/client/features/blog-tracking/blogTrackingQueries";
import { formatNumber } from "@/i18n/format";
import { removeBlogPosts } from "@/serverFunctions/blogTracking";
import {
  BLOG_TRACKING_RANGES,
  type BlogTrackingDateRange,
} from "@/types/schemas/blog-tracking";

function isRange(value: string): value is BlogTrackingDateRange {
  return (BLOG_TRACKING_RANGES as readonly string[]).includes(value);
}

export function BlogTrackingPage({
  projectId,
  dateRange,
  onDateRangeChange,
}: {
  projectId: string;
  dateRange: BlogTrackingDateRange;
  onDateRangeChange: (range: BlogTrackingDateRange) => void;
}) {
  const { t } = useTranslation("blogTracking");
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BlogPostRow | null>(null);
  const [removing, setRemoving] = useState<BlogPostRow | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reportQuery = useQuery({
    ...blogTrackingReportOptions(projectId, dateRange),
    placeholderData: keepPreviousData,
  });
  const report = reportQuery.data;

  const removal = useMutation({
    mutationFn: (post: BlogPostRow) =>
      removeBlogPosts({ data: { projectId, ids: [post.id] } }),
    meta: { errorToast: false },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: blogTrackingQueryKey(projectId),
      });
      toast.success(t("row.removed"));
      setRemoving(null);
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });

  const rangeItems = BLOG_TRACKING_RANGES.map((range) => ({
    value: range,
    label: t(`ranges.${range}`),
  }));

  const posts = report?.posts ?? [];
  const totalClicks = posts.reduce(
    (sum, post) => sum + (post.current?.clicks ?? 0),
    0,
  );
  const rising = posts.filter((post) => post.status === "rising").length;
  const declining = posts.filter((post) => post.status === "declining").length;

  return (
    <div className="overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <>
              <Select
                items={rangeItems}
                value={dateRange}
                onValueChange={(value) => {
                  if (value && isRange(value)) onDateRangeChange(value);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-36"
                  aria-label={t("rangeLabel")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rangeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus data-icon="inline-start" />
                {t("addPosts")}
              </Button>
            </>
          }
        />

        {reportQuery.isPending ? (
          <SkeletonPage />
        ) : !report ? (
          <QueryError
            error={reportQuery.error}
            fallback={t("loadFailed")}
            onRetry={() => void reportQuery.refetch()}
            isRetrying={reportQuery.isFetching}
          />
        ) : (
          <>
            {!report.connected ? (
              <Alert variant="info">
                <AlertDescription>{t("connectHint")}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: t("summary.total"), value: posts.length },
                { label: t("summary.clicks"), value: totalClicks },
                { label: t("summary.rising"), value: rising },
                { label: t("summary.declining"), value: declining },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatNumber(item.value)}
                  </p>
                </div>
              ))}
            </div>

            {posts.length === 0 ? (
              <EmptyState
                icon={Newspaper}
                title={t("empty.title")}
                description={t("empty.description")}
                action={
                  <Button size="sm" onClick={() => setAdding(true)}>
                    <Plus data-icon="inline-start" />
                    {t("addPosts")}
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>{t("columns.post")}</TableHead>
                      <TableHead>{t("columns.status")}</TableHead>
                      <TableHead className="text-right">
                        {t("columns.clicks")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("columns.change")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("columns.impressions")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("columns.ctr")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("columns.position")}
                      </TableHead>
                      <TableHead>{t("columns.targetKeyword")}</TableHead>
                      <TableHead className="w-10">
                        <span className="sr-only">{t("columns.actions")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => {
                      const isOpen = expanded === post.id;
                      return (
                        <BlogPostTableRow
                          key={post.id}
                          post={post}
                          isOpen={isOpen}
                          connected={report.connected}
                          projectId={projectId}
                          dateRange={dateRange}
                          onToggle={() => setExpanded(isOpen ? null : post.id)}
                          onEdit={() => setEditing(post)}
                          onRemove={() => setRemoving(post)}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      {adding ? (
        <AddBlogPostsDialog
          projectId={projectId}
          suggestions={report?.suggestions ?? []}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {editing ? (
        <EditBlogPostDialog
          projectId={projectId}
          post={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title={t("row.removeConfirm")}
          confirmLabel={t("row.remove")}
          destructive
          pending={removal.isPending}
          onConfirm={() => removal.mutate(removing)}
          onClose={() => setRemoving(null)}
        >
          <p className="break-all text-sm text-muted-foreground">
            {removing.url}
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
