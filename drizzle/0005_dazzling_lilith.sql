DO $$ BEGIN
 CREATE TYPE "public"."background_surface_mode" AS ENUM('dark', 'light');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appearance_backgrounds" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"background" text NOT NULL,
	"foreground" varchar(120) NOT NULL,
	"accent" varchar(120) NOT NULL,
	"border" varchar(160) NOT NULL,
	"swatches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"surface_mode" "background_surface_mode" DEFAULT 'dark' NOT NULL,
	"accessible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appearance_backgrounds_accessible_idx" ON "appearance_backgrounds" USING btree ("accessible");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appearance_backgrounds_sort_order_idx" ON "appearance_backgrounds" USING btree ("sort_order");
