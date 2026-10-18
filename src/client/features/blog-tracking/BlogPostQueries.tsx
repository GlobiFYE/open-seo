import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/client/components/Spinner";
import { blogPostQueriesOptions } from "@/client/features/blog-tracking/blogTrackingQueries";
import { formatNumber } from "@/i18n/format";
import type { BlogTrackingDateRange } from "@/types/schemas/blog-tracking";

export function BlogPostQueries({
  projectId,
  url,
  dateRange,
}: {
  projectId: string;
  url: string;
  dateRange: BlogTrackingDateRange;
}) {
  const { t } = useTranslation("blogTracking");
  const query = useQuery(blogPostQueriesOptions(projectId, url, dateRange));

  if (query.isPending)
    return <Spinner size="sm" label={t("queries.loading")} className="p-3" />;
  if (query.isError)
    return (
      <p className="p-3 text-sm text-destructive">{t("queries.failed")}</p>
    );
  if (query.data.queries.length === 0)
    return (
      <p className="p-3 text-sm text-muted-foreground">{t("queries.empty")}</p>
    );

  return (
    <div className="space-y-2 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        {t("queries.title")}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 font-medium">{t("queries.query")}</th>
            <th className="py-1 text-right font-medium">
              {t("columns.clicks")}
            </th>
            <th className="py-1 text-right font-medium">
              {t("columns.impressions")}
            </th>
            <th className="py-1 text-right font-medium">
              {t("columns.position")}
            </th>
          </tr>
        </thead>
        <tbody>
          {query.data.queries.map((row) => (
            <tr key={row.key} className="border-t border-border/60">
              <td className="py-1.5 pr-3">{row.key}</td>
              <td className="py-1.5 text-right tabular-nums">
                {formatNumber(row.clicks)}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatNumber(row.impressions)}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatNumber(row.position, { maximumFractionDigits: 1 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
