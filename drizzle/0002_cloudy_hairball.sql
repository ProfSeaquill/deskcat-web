CREATE TABLE "donation_settings" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"action_label" text NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"goal_amount" integer NOT NULL,
	"current_amount" integer NOT NULL,
	"rewards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
