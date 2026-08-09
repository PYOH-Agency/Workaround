ALTER TABLE "company" ADD COLUMN "agenda_feed_token" text;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_agenda_feed_token_unique" UNIQUE("agenda_feed_token");