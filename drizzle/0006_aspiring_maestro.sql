DO $$ BEGIN
 CREATE TYPE "public"."reflection_tree_status" AS ENUM('draft', 'published');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reflection_tree_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision" integer NOT NULL,
	"status" "reflection_tree_status" DEFAULT 'draft' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"document" jsonb NOT NULL,
	"updated_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reflection_tree_revisions_revision_idx" ON "reflection_tree_revisions" USING btree ("revision");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reflection_tree_revisions_status_revision_idx" ON "reflection_tree_revisions" USING btree ("status","revision");
