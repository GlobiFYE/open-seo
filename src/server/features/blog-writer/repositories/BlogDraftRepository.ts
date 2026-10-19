import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectBlogDrafts } from "@/db/schema";

type DraftRow = typeof projectBlogDrafts.$inferSelect;
type DraftInsert = Omit<
  typeof projectBlogDrafts.$inferInsert,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;

async function list(projectId: string) {
  return db
    .select({
      id: projectBlogDrafts.id,
      status: projectBlogDrafts.status,
      title: projectBlogDrafts.title,
      targetKeyword: projectBlogDrafts.targetKeyword,
      languageCode: projectBlogDrafts.languageCode,
      wordCount: projectBlogDrafts.wordCount,
      publishedUrl: projectBlogDrafts.publishedUrl,
      updatedAt: projectBlogDrafts.updatedAt,
      createdAt: projectBlogDrafts.createdAt,
    })
    .from(projectBlogDrafts)
    .where(eq(projectBlogDrafts.projectId, projectId))
    .orderBy(desc(projectBlogDrafts.updatedAt));
}

async function listRecentNotes(projectId: string, limit: number) {
  return db
    .select({
      title: projectBlogDrafts.title,
      researchNotes: projectBlogDrafts.researchNotes,
    })
    .from(projectBlogDrafts)
    .where(eq(projectBlogDrafts.projectId, projectId))
    .orderBy(desc(projectBlogDrafts.updatedAt))
    .limit(limit);
}

async function get(projectId: string, id: string): Promise<DraftRow | null> {
  const [row] = await db
    .select()
    .from(projectBlogDrafts)
    .where(
      and(
        eq(projectBlogDrafts.projectId, projectId),
        eq(projectBlogDrafts.id, id),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function create(projectId: string, values: DraftInsert) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db
    .insert(projectBlogDrafts)
    .values({ id, projectId, ...values, createdAt: now, updatedAt: now });
  return id;
}

async function update(
  projectId: string,
  id: string,
  values: Partial<DraftInsert>,
) {
  await db
    .update(projectBlogDrafts)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(projectBlogDrafts.projectId, projectId),
        eq(projectBlogDrafts.id, id),
      ),
    );
}

async function remove(projectId: string, id: string) {
  await db
    .delete(projectBlogDrafts)
    .where(
      and(
        eq(projectBlogDrafts.projectId, projectId),
        eq(projectBlogDrafts.id, id),
      ),
    );
}

export const BlogDraftRepository = {
  list,
  listRecentNotes,
  get,
  create,
  update,
  remove,
};
