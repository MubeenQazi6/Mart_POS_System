CREATE TABLE `held_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cart_data` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`line_total_minor` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sale_items_sale_id` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_items_variant_id` ON `sale_items` (`variant_id`);--> statement-breakpoint
CREATE TABLE `sale_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`payment_method` text NOT NULL,
	`amount_minor` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sale_payments_sale_id` ON `sale_payments` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`subtotal_minor` integer NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_number_unique` ON `sales` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `idx_sales_invoice_number` ON `sales` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `idx_sales_status` ON `sales` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);