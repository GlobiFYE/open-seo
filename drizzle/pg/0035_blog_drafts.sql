CREATE TABLE "project_blog_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"target_keyword" text NOT NULL,
	"secondary_keywords" text,
	"language_code" text,
	"title" text NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"slug" text,
	"excerpt" text,
	"content_html" text NOT NULL,
	"faq_json" text,
	"image_suggestions_json" text,
	"internal_links_json" text,
	"research_notes" text,
	"word_count" integer DEFAULT 0 NOT NULL,
	"published_url" text,
	"updated_by" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_blog_drafts" ADD CONSTRAINT "project_blog_drafts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_blog_drafts_project_updated_idx" ON "project_blog_drafts" USING btree ("project_id","updated_at");