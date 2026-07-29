CREATE TABLE "donation_payments" (
	"checkout_session_id" varchar(255) PRIMARY KEY NOT NULL,
	"payment_intent_id" varchar(255),
	"stripe_event_id" varchar(255),
	"amount_cents" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donation_settings" ADD COLUMN "current_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "donation_settings" SET "current_amount_cents" = "current_amount" * 100;--> statement-breakpoint
CREATE UNIQUE INDEX "donation_payments_payment_intent_idx" ON "donation_payments" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "donation_payments_stripe_event_idx" ON "donation_payments" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "donation_payments_received_at_idx" ON "donation_payments" USING btree ("received_at");
