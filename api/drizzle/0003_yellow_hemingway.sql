CREATE INDEX "materials_material_number_trgm_idx" ON "materials" USING gin ("material_number" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "materials_description_trgm_idx" ON "materials" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "materials_mpn_trgm_idx" ON "materials" USING gin ("mpn" gin_trgm_ops);