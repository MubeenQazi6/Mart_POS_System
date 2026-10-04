ALTER TABLE `sale_items` ADD COLUMN `unit_cost_minor` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `sale_items`
SET `unit_cost_minor` = (
  SELECT `purchase_price_minor`
  FROM `product_variants`
  WHERE `product_variants`.`id` = `sale_items`.`variant_id`
);