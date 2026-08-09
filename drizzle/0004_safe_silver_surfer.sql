ALTER TABLE "cosmetic_assets" ADD COLUMN IF NOT EXISTS "accessible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cosmetic_assets" ADD COLUMN IF NOT EXISTS "updated_by_email" text;--> statement-breakpoint
ALTER TABLE "cosmetic_assets" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
