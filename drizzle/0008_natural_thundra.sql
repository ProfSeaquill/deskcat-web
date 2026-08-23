CREATE TABLE "deskcat_anchor_settings" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"document" jsonb NOT NULL,
	"updated_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
