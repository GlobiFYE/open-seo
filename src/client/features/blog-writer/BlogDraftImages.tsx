import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sort } from "remeda";
import { Download, ExternalLink, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { downloadFile } from "@/client/lib/download";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { BlogDraft } from "@/client/features/blog-writer/blogWriterQueries";
import { downloadBlogImages } from "@/serverFunctions/blogDrafts";

type Image = BlogDraft["imageSuggestions"][number];

function saveBase64Zip(base64: string, fileName: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/zip" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | undefined) {
  const text = value ?? "";
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function imagesCsv(images: Image[]) {
  const header =
    "alt_text,placement,source,image_url,source_page,credit,product_url";
  const rows = images.map((image) =>
    [
      image.alt,
      image.placement,
      image.source,
      image.url,
      image.pageUrl,
      image.credit,
      image.productUrl,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

function ImageCard({
  image,
  checked,
  onToggle,
}: {
  image: Image;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const { t } = useTranslation("blogWriter");
  const preview = image.previewUrl ?? image.url;
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card text-sm">
      {preview ? (
        <a href={image.pageUrl ?? image.url} target="_blank" rel="noreferrer">
          <img
            src={preview}
            alt={image.alt}
            loading="lazy"
            className="aspect-[4/3] w-full bg-muted object-cover"
          />
        </a>
      ) : null}
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-center gap-2">
          {image.url ? (
            <Checkbox
              checked={checked}
              onCheckedChange={(value) => onToggle(value)}
              aria-label={t("images.select")}
            />
          ) : null}
          {image.source ? (
            <Badge
              variant={image.source === "product" ? "success" : "secondary"}
            >
              {t(`images.source.${image.source}`)}
            </Badge>
          ) : null}
          <span className="truncate text-xs text-muted-foreground">
            {image.placement || "–"}
          </span>
        </div>
        <p>{image.alt}</p>
        {image.description ? (
          <p className="text-xs text-muted-foreground">{image.description}</p>
        ) : null}
        {image.productUrl ? (
          <a
            href={image.productUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs underline underline-offset-4"
          >
            {image.productTitle ?? t("images.product")}
            <ExternalLink className="size-3" />
          </a>
        ) : image.credit ? (
          <a
            href={image.creditUrl ?? image.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-muted-foreground underline underline-offset-4"
          >
            {t("images.credit", { credit: image.credit })}
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function BlogDraftImages({
  projectId,
  draft,
}: {
  projectId: string;
  draft: BlogDraft;
}) {
  const { t } = useTranslation("blogWriter");
  const images = draft.imageSuggestions;
  const downloadable = images
    .map((image, index) => ({ image, index }))
    .filter((entry) => Boolean(entry.image.url));
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const zip = useMutation({
    mutationFn: (indexes?: number[]) =>
      downloadBlogImages({ data: { projectId, id: draft.id, indexes } }),
    meta: { errorToast: false },
    onSuccess: (result) => {
      saveBase64Zip(result.base64, result.fileName);
      if (result.skipped.length > 0)
        toast.warning(t("images.skipped", { count: result.skipped.length }), {
          description: result.skipped.join("\n"),
        });
      else toast.success(t("images.downloaded", { count: result.fileCount }));
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });

  if (images.length === 0)
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>{t("detail.noImages")}</p>
        <p>{t("images.howTo")}</p>
      </div>
    );

  const toggle = (index: number, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={downloadable.length === 0 || zip.isPending}
          onClick={() => zip.mutate(undefined)}
        >
          <Download />
          {zip.isPending
            ? t("images.preparing")
            : t("images.downloadAll", { count: downloadable.length })}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={selected.size === 0 || zip.isPending}
          onClick={() => zip.mutate(sort([...selected], (a, b) => a - b))}
        >
          <Download />
          {t("images.downloadSelected", { count: selected.size })}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            downloadFile(
              imagesCsv(images),
              `${draft.slug ?? "blog"}-images.csv`,
              "text/csv",
            )
          }
        >
          <FileSpreadsheet />
          {t("images.downloadCsv")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("images.hint")}</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image, index) => (
          <ImageCard
            key={`${index}-${image.alt}`}
            image={image}
            checked={selected.has(index)}
            onToggle={(checked) => toggle(index, checked)}
          />
        ))}
      </ul>
    </div>
  );
}
