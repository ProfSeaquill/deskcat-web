CREATE TYPE "public"."anchor_slot" AS ENUM('eyes', 'head', 'neck', 'tail');--> statement-breakpoint
CREATE TYPE "public"."asset_view" AS ENUM('front', 'threeQuarter');--> statement-breakpoint
CREATE TYPE "public"."cosmetic_asset_purpose" AS ENUM('preview', 'render');--> statement-breakpoint
CREATE TYPE "public"."cosmetic_category" AS ENUM('head', 'neck', 'tail', 'glasses');--> statement-breakpoint
CREATE TYPE "public"."cosmetic_status" AS ENUM('draft', 'testing', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."pose_id" AS ENUM('logo', 'playing', 'reading', 'sleeping', 'sitting', 'walking');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_email" text NOT NULL,
	"action" varchar(120) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cosmetic_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cosmetic_id" varchar(80) NOT NULL,
	"purpose" "cosmetic_asset_purpose" NOT NULL,
	"asset_view" "asset_view",
	"pose_id" "pose_id",
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cosmetic_pose_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cosmetic_id" varchar(80) NOT NULL,
	"pose_id" "pose_id" NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"width" double precision NOT NULL,
	"height" double precision,
	"rotation" double precision DEFAULT 0 NOT NULL,
	"z_index" integer DEFAULT 0 NOT NULL,
	"asset_view" "asset_view" DEFAULT 'front' NOT NULL,
	"flip_x" boolean DEFAULT false NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cosmetics" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" "cosmetic_category" NOT NULL,
	"anchor_slot" "anchor_slot" NOT NULL,
	"status" "cosmetic_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cosmetic_assets" ADD CONSTRAINT "cosmetic_assets_cosmetic_id_cosmetics_id_fk" FOREIGN KEY ("cosmetic_id") REFERENCES "public"."cosmetics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cosmetic_pose_placements" ADD CONSTRAINT "cosmetic_pose_placements_cosmetic_id_cosmetics_id_fk" FOREIGN KEY ("cosmetic_id") REFERENCES "public"."cosmetics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actor_email_idx" ON "admin_audit_logs" USING btree ("actor_email");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_idx" ON "admin_audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cosmetic_assets_cosmetic_id_idx" ON "cosmetic_assets" USING btree ("cosmetic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cosmetic_assets_variant_idx" ON "cosmetic_assets" USING btree ("cosmetic_id","purpose","asset_view","pose_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cosmetic_pose_placements_cosmetic_pose_idx" ON "cosmetic_pose_placements" USING btree ("cosmetic_id","pose_id");--> statement-breakpoint
CREATE INDEX "cosmetic_pose_placements_pose_id_idx" ON "cosmetic_pose_placements" USING btree ("pose_id");--> statement-breakpoint
CREATE INDEX "cosmetics_status_idx" ON "cosmetics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cosmetics_category_idx" ON "cosmetics" USING btree ("category");