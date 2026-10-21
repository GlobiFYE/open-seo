CREATE TABLE `lead_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`email` text NOT NULL,
	`check_status` text NOT NULL,
	`kind` text NOT NULL,
	`on_own_domain` integer DEFAULT false NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_emails_lead_email_unique` ON `lead_emails` (`lead_id`,`email`);--> statement-breakpoint
CREATE TABLE `lead_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`label` text NOT NULL,
	`category` text NOT NULL,
	`name_query` text,
	`location_label` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`radius_km` integer NOT NULL,
	`requested_limit` integer NOT NULL,
	`skipped_duplicates` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_searches_project_created_idx` ON `lead_searches` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`search_id` text NOT NULL,
	`business_key` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`address` text,
	`phone` text,
	`website` text,
	`domain` text,
	`rating` real,
	`reviews_count` integer,
	`maps_url` text,
	`enrichment_status` text DEFAULT 'pending' NOT NULL,
	`contact_page_url` text,
	`instagram_url` text,
	`facebook_url` text,
	`linkedin_url` text,
	`whatsapp_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`search_id`) REFERENCES `lead_searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_project_business_key_unique` ON `leads` (`project_id`,`business_key`);--> statement-breakpoint
CREATE INDEX `leads_search_status_idx` ON `leads` (`search_id`,`enrichment_status`);