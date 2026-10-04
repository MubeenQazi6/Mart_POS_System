ALTER TABLE `products` ADD COLUMN `deleted_at` TEXT;
--> statement-breakpoint
ALTER TABLE `product_variants` ADD COLUMN `deleted_at` TEXT;

