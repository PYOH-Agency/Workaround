ALTER TABLE "quote" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "completion_source" text;