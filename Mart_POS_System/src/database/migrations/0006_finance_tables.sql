CREATE TABLE `expense_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_expense_categories_name` ON `expense_categories` (`name`);--> statement-breakpoint
CREATE INDEX `idx_expense_categories_is_active` ON `expense_categories` (`is_active`);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expense_number` text NOT NULL,
	`category_id` integer NOT NULL,
	`amount_minor` integer NOT NULL,
	`payment_method` text NOT NULL,
	`description` text,
	`expense_date` text NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`status` text DEFAULT 'POSTED' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_expense_number_unique` ON `expenses` (`expense_number`);--> statement-breakpoint
CREATE INDEX `idx_expenses_category_id` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_expenses_expense_date` ON `expenses` (`expense_date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_status` ON `expenses` (`status`);--> statement-breakpoint
CREATE INDEX `idx_expenses_created_by` ON `expenses` (`created_by`);
--> statement-breakpoint
CREATE TABLE `cash_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_date` text NOT NULL,
	`opened_by` integer,
	`opened_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`opening_cash_minor` integer NOT NULL,
	`closed_by` integer,
	`closed_at` text,
	`expected_cash_minor` integer DEFAULT 0 NOT NULL,
	`actual_cash_minor` integer,
	`variance_minor` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_business_date` ON `cash_sessions` (`business_date`);--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_status` ON `cash_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_opened_by` ON `cash_sessions` (`opened_by`);
--> statement-breakpoint
CREATE TABLE `cash_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`movement_type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`reference_type` text,
	`reference_id` integer,
	`description` text,
	`created_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `cash_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cash_movements_session_id` ON `cash_movements` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_cash_movements_type` ON `cash_movements` (`movement_type`);--> statement-breakpoint
CREATE INDEX `idx_cash_movements_created_at` ON `cash_movements` (`created_at`);
