import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import { projectBlogPosts } from "@/db/schema";

const ROWS_PER_INSERT = 10;
const VALUES_PER_DELETE = 90;

type BlogPostInput = {
  url: string;
  title: string | null;
  targetKeyword: string | null;
  publishedAt: string | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function list(projectId: string) {
  return db
    .select()
    .from(projectBlogPosts)
    .where(eq(projectBlogPosts.projectId, projectId))
    .orderBy(asc(projectBlogPosts.createdAt), asc(projectBlogPosts.url));
}

async function upsert(projectId: string, posts: BlogPostInput[]) {
  if (posts.length === 0) return;
  const updatedAt = new Date().toISOString();
  await runBatch((tx) =>
    chunk(posts, ROWS_PER_INSERT).map((postChunk) =>
      tx
        .insert(projectBlogPosts)
        .values(
          postChunk.map((post) => ({
            id: crypto.randomUUID(),
            projectId,
            ...post,
            createdAt: updatedAt,
            updatedAt,
          })),
        )
        .onConflictDoUpdate({
          target: [projectBlogPosts.projectId, projectBlogPosts.url],
          set: {
            title: sql`coalesce(excluded.title, ${projectBlogPosts.title})`,
            targetKeyword: sql`coalesce(excluded.target_keyword, ${projectBlogPosts.targetKeyword})`,
            publishedAt: sql`coalesce(excluded.published_at, ${projectBlogPosts.publishedAt})`,
            updatedAt,
          },
        }),
    ),
  );
}

async function update(
  projectId: string,
  id: string,
  fields: Omit<BlogPostInput, "url">,
) {
  await db
    .update(projectBlogPosts)
    .set({ ...fields, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(projectBlogPosts.projectId, projectId),
        eq(projectBlogPosts.id, id),
      ),
    );
}

async function remove(projectId: string, ids: string[]) {
  if (ids.length === 0) return;
  await runBatch((tx) =>
    chunk(ids, VALUES_PER_DELETE).map((idChunk) =>
      tx
        .delete(projectBlogPosts)
        .where(
          and(
            eq(projectBlogPosts.projectId, projectId),
            inArray(projectBlogPosts.id, idChunk),
          ),
        ),
    ),
  );
}

export const BlogPostRepository = { list, upsert, update, remove };
