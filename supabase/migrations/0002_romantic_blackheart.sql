ALTER TABLE "company" ADD COLUMN "legal_form_label" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "registration_number" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "vat_exempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "quote_validity_days" integer DEFAULT 90;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "validity_days" integer DEFAULT 90 NOT NULL;