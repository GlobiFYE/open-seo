CREATE TABLE "project_blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"target_keyword" text,
	"published_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_blog_posts" ADD CONSTRAINT "project_blog_posts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_blog_posts_project_url_idx" ON "project_blog_posts" USING btree ("project_id","url");