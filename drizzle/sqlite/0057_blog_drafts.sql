CREATE TABLE `project_blog_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`target_keyword` text NOT NULL,
	`secondary_keywords` text,
	`language_code` text,
	`title` text NOT NULL,
	`meta_title` text,
	`meta_description` text,
	`slug` text,
	`excerpt` text,
	`content_html` text NOT NULL,
	`faq_json` text,
	`image_suggestions_json` text,
	`internal_links_json` text,
	`research_notes` text,
	`word_count` integer DEFAULT 0 NOT NULL,
	`published_url` text,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_blog_drafts_project_updated_idx` ON `project_blog_drafts` (`project_id`,`updated_at`);