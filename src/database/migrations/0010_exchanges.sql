CREATE TABLE `sales_exchanges` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `exchange_number` text NOT NULL UNIQUE,
  `sale_id` integer NOT NULL,
  `customer_id` integer,
  `return_total_minor` integer NOT NULL,
  `replacement_total_minor` integer NOT NULL,
  `difference_minor` integer NOT NULL,
  `settlement_method` text NOT NULL,
  `reason` text NOT NULL,
  `created_by` integer,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sales_exchanges_sale_id` ON `sales_exchanges` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_exchanges_created_at` ON `sales_exchanges` (`created_at`);--> statement-breakpoint
CREATE TABLE `sales_exchange_return_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `exchange_id` integer NOT NULL,
  `sale_item_id` integer NOT NULL,
  `variant_id` integer NOT NULL,
  `quantity` integer NOT NULL,
  `unit_price_minor` integer NOT NULL,
  `total_amount_minor` integer NOT NULL,
  `return_condition` text DEFAULT 'resalable' NOT NULL,
  FOREIGN KEY (`exchange_id`) REFERENCES `sales_exchanges`(`id`),
  FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sales_exchange_return_items_exchange_id` ON `sales_exchange_return_items` (`exchange_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_exchange_return_items_sale_item_id` ON `sales_exchange_return_items` (`sale_item_id`);--> statement-breakpoint
CREATE TABLE `sales_exchange_replacement_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `exchange_id` integer NOT NULL,
  `variant_id` integer NOT NULL,
  `quantity` integer NOT NULL,
  `unit_price_minor` integer NOT NULL,
  `total_amount_minor` integer NOT NULL,
  FOREIGN KEY (`exchange_id`) REFERENCES `sales_exchanges`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sales_exchange_replacement_items_exchange_id` ON `sales_exchange_replacement_items` (`exchange_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_exchange_replacement_items_variant_id` ON `sales_exchange_replacement_items` (`variant_id`);--> statement-breakpoint
CREATE TABLE `purchase_exchanges` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `exchange_number` text NOT NULL UNIQUE,
  `purchase_id` integer NOT NULL,
  `supplier_id` integer NOT NULL,
  `return_total_minor` integer NOT NULL,
  `replacement_total_minor` integer NOT NULL,
  `difference_minor` integer NOT NULL,
  `settlement_method` text DEFAULT 'balance_adjustment' NOT NULL,
  `reason` text NOT NULL,
  `created_by` integer,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`),
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_exchanges_purchase_id` ON `purchase_exchanges` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_exchanges_created_at` ON `purchase_exchanges` (`created_at`);--> statement-breakpoint
CREATE TABLE `purchase_exchange_return_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `exchange_id` integer NOT NULL,
  `purchase_item_id` integer NOT NULL,
  `variant_id` integer NOT NULL,
  `quantity` integer NOT NULL,
  `unit_cost_minor` integer NOT NULL,
  `total_amount_minor` integer NOT NULL,
  FOREIGN KEY (`exchange_id`) REFERENCES `purchase_exchanges`(`id`),
  FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_exchange_return_items_exchange_id` ON `purchase_exchange_return_items` (`exchange_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_exchange_return_items_purchase_item_id` ON `purchase_exchange_return_items` (`purchase_item_id`);--> statement-breakpoint
CREATE TABLE `purchase_exchange_replacement_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `exchange_id` integer NOT NULL,
  `variant_id` integer NOT NULL,
  `quantity` integer NOT NULL,
  `unit_cost_minor` integer NOT NULL,
  `total_amount_minor` integer NOT NULL,
  FOREIGN KEY (`exchange_id`) REFERENCES `purchase_exchanges`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_exchange_replacement_items_exchange_id` ON `purchase_exchange_replacement_items` (`exchange_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_exchange_replacement_items_variant_id` ON `purchase_exchange_replacement_items` (`variant_id`);
