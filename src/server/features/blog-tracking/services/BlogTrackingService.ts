import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import {
  resolveDateRange,
  type GscPerformanceFilter,
} from "@/server/features/gsc/searchAnalytics";
import {
  previousPeriod,
  toDimensionRows,
} from "@/server/features/gsc/searchPerformanceReport";
import { BlogPostRepository } from "@/server/features/blog-tracking/repositories/BlogPostRepository";
import {
  buildBlogPostRows,
  suggestBlogPages,
} from "@/server/features/blog-tracking/services/blogTrackingReport";
import type { BlogTrackingDateRange } from "@/types/schemas/blog-tracking";

const PAGE_ROW_LIMIT = 5000;
const QUERY_PAGE_ROW_LIMIT = 25000;
const POST_QUERY_LIMIT = 25;

type BlogPostFields = {
  title: string | null;
  targetKeyword: string | null;
  publishedAt: string | null;
};

function isExpectedConnectionFailure(error: unknown) {
  return error instanceof GscNotConnectedError || isExpectedGrantFailure(error);
}

async function fetchSearchData(
  projectId: string,
  dateRange: BlogTrackingDateRange,
) {
  const { startDate, endDate } = resolveDateRange({ dateRange });
  const previous = previousPeriod(startDate, endDate);
  const [currentPages, previousPages, queryPages] = await Promise.all([
    GscService.getPerformance({
      projectId,
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: PAGE_ROW_LIMIT,
    }),
    GscService.getPerformance({
      projectId,
      startDate: previous.startDate,
      endDate: previous.endDate,
      dimensions: ["page"],
      rowLimit: PAGE_ROW_LIMIT,
    }),
    GscService.getPerformance({
      projectId,
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit: QUERY_PAGE_ROW_LIMIT,
    }),
  ]);
  return {
    range: {
      startDate,
      endDate,
      previousStartDate: previous.startDate,
      previousEndDate: previous.endDate,
    },
    currentPages: currentPages.rows,
    previousPages: previousPages.rows,
    queryPages: queryPages.rows,
  };
}

async function getReport(projectId: string, dateRange: BlogTrackingDateRange) {
  const posts = await BlogPostRepository.list(projectId);
  try {
    const data = await fetchSearchData(projectId, dateRange);
    return {
      connected: true as const,
      range: data.range,
      posts: buildBlogPostRows(posts, data),
      suggestions: suggestBlogPages(
        data.currentPages,
        posts.map((post) => post.url),
      ),
    };
  } catch (error) {
    if (!isExpectedConnectionFailure(error)) throw error;
    return {
      connected: false as const,
      range: null,
      posts: buildBlogPostRows(posts, null),
      suggestions: [],
    };
  }
}

async function getPostQueries(
  projectId: string,
  url: string,
  dateRange: BlogTrackingDateRange,
) {
  const { startDate, endDate } = resolveDateRange({ dateRange });
  const filters: GscPerformanceFilter[] = [
    { dimension: "page", operator: "equals", expression: url },
  ];
  try {
    const result = await GscService.getPerformance({
      projectId,
      startDate,
      endDate,
      dimensions: ["query"],
      filters,
      rowLimit: POST_QUERY_LIMIT,
    });
    return { connected: true as const, queries: toDimensionRows(result.rows) };
  } catch (error) {
    if (!isExpectedConnectionFailure(error)) throw error;
    return { connected: false as const, queries: [] };
  }
}

async function addPosts(
  projectId: string,
  posts: (BlogPostFields & { url: string })[],
) {
  await BlogPostRepository.upsert(projectId, posts);
  return { added: posts.length };
}

async function updatePost(
  projectId: string,
  id: string,
  fields: BlogPostFields,
) {
  await BlogPostRepository.update(projectId, id, fields);
  return { ok: true as const };
}

async function removePosts(projectId: string, ids: string[]) {
  await BlogPostRepository.remove(projectId, ids);
  return { removed: ids.length };
}

export const BlogTrackingService = {
  getReport,
  getPostQueries,
  addPosts,
  updatePost,
  removePosts,
};
