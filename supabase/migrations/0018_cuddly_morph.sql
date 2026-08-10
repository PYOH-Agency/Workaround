ALTER TABLE "quote" ADD COLUMN "retention_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "retention_rate" integer DEFAULT 0 NOT NULL;