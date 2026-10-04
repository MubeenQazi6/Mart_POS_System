CREATE TABLE `sales_returns` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `return_number` text NOT NULL UNIQUE,
  `sale_id` integer NOT NULL,
  `customer_id` integer,
  `refund_amount_minor` integer NOT NULL,
  `refund_method` text NOT NULL,
  `reason` text NOT NULL,
  `created_by` integer,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sales_returns_sale_id` ON `sales_returns` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_returns_created_at` ON `sales_returns` (`created_at`);--> statement-breakpoint
CREATE TABLE `sales_return_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `return_id` integer NOT NULL,
  `sale_item_id` integer NOT NULL,
  `variant_id` integer NOT NULL,
  `quantity` integer NOT NULL,
  `unit_price_minor` integer NOT NULL,
  `refund_amount_minor` integer NOT NULL,
  `return_condition` text NOT NULL,
  FOREIGN KEY (`return_id`) REFERENCES `sales_returns`(`id`),
  FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sales_return_items_return_id` ON `sales_return_items` (`return_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_return_items_sale_item_id` ON `sales_return_items` (`sale_item_id`);--> statement-breakpoint
CREATE TABLE `purchase_returns` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `return_number` text NOT NULL UNIQUE,
  `purchase_id` integer NOT NULL,
  `supplier_id` integer NOT NULL,
  `refund_amount_minor` integer NOT NULL,
  `refund_method` text NOT NULL,
  `reason` text NOT NULL,
  `created_by` integer,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`),
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_returns_purchase_id` ON `purchase_returns` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_returns_created_at` ON `purchase_returns` (`created_at`);--> statement-breakpoint
CREATE TABLE `purchase_return_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `return_id` integer NOT NULL,
  `purchase_item_id` integer NOT NULL,
  `variant_id` integer NOT NULL,
  `quantity` integer NOT NULL,
  `unit_cost_minor` integer NOT NULL,
  `refund_amount_minor` integer NOT NULL,
  FOREIGN KEY (`return_id`) REFERENCES `purchase_returns`(`id`),
  FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_return_items_return_id` ON `purchase_return_items` (`return_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_return_items_purchase_item_id` ON `purchase_return_items` (`purchase_item_id`);