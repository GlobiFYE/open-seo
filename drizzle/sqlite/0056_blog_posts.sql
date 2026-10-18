CREATE TABLE `project_blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`target_keyword` text,
	`published_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_blog_posts_project_url_idx` ON `project_blog_posts` (`project_id`,`url`);