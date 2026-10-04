CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`contact_person` text,
	`phone` text,
	`email` text,
	`address` text,
	`opening_balance_minor` integer DEFAULT 0 NOT NULL,
	`current_balance_minor` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_suppliers_name` ON `suppliers` (`name`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_phone` ON `suppliers` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_is_active` ON `suppliers` (`is_active`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_number` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`supplier_invoice_number` text,
	`subtotal_minor` integer NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer NOT NULL,
	`paid_amount_minor` integer DEFAULT 0 NOT NULL,
	`balance_minor` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'paid' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_purchase_number_unique` ON `purchases` (`purchase_number`);--> statement-breakpoint
CREATE INDEX `idx_purchases_purchase_number` ON `purchases` (`purchase_number`);--> statement-breakpoint
CREATE INDEX `idx_purchases_supplier_id` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_purchases_payment_status` ON `purchases` (`payment_status`);--> statement-breakpoint
CREATE INDEX `idx_purchases_created_at` ON `purchases` (`created_at`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost_minor` integer NOT NULL,
	`line_total_minor` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_items_purchase_id` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_items_variant_id` ON `purchase_items` (`variant_id`);--> statement-breakpoint
CREATE TABLE `purchase_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer,
	`supplier_id` integer NOT NULL,
	`payment_method` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`reference_number` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_payments_purchase_id` ON `purchase_payments` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_payments_supplier_id` ON `purchase_payments` (`supplier_id`);--> statement-breakpoint
CREATE TABLE `supplier_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`transaction_type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`reference_type` text,
	`reference_id` integer,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_supplier_transactions_supplier_id` ON `supplier_transactions` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_supplier_transactions_type` ON `supplier_transactions` (`transaction_type`);--> statement-breakpoint
CREATE INDEX `idx_supplier_transactions_created_at` ON `supplier_transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`address` text,
	`credit_limit_minor` integer DEFAULT 0 NOT NULL,
	`opening_balance_minor` integer DEFAULT 0 NOT NULL,
	`current_balance_minor` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_unique` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_customers_name` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `idx_customers_phone` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_customers_is_active` ON `customers` (`is_active`);--> statement-breakpoint
CREATE TABLE `customer_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`transaction_type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`reference_type` text,
	`reference_id` integer,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_customer_transactions_customer_id` ON `customer_transactions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_transactions_type` ON `customer_transactions` (`transaction_type`);--> statement-breakpoint
CREATE INDEX `idx_customer_transactions_created_at` ON `customer_transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `customer_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`payment_method` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_customer_payments_customer_id` ON `customer_payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_payments_created_at` ON `customer_payments` (`created_at`);
