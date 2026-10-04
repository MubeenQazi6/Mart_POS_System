CREATE TABLE `barcode_print_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`barcode_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barcode_id`) REFERENCES `product_barcodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_barcode_print_jobs_variant_id` ON `barcode_print_jobs` (`variant_id`);--> statement-breakpoint
CREATE INDEX `idx_barcode_print_jobs_status` ON `barcode_print_jobs` (`status`);