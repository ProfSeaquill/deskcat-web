CREATE TABLE "feature_flags" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"updated_by_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
