ALTER TABLE "cosmetic_assets" ADD COLUMN "accessible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cosmetic_assets" ADD COLUMN "updated_by_email" text;--> statement-breakpoint
ALTER TABLE "cosmetic_assets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;