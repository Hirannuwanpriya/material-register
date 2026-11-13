CREATE INDEX "materials_description_idx" ON "materials" USING btree ("description");--> statement-breakpoint
CREATE INDEX "materials_unit_price_idx" ON "materials" USING btree ("unit_price");--> statement-breakpoint
CREATE INDEX "materials_stock_qty_idx" ON "materials" USING btree ("stock_qty");