CREATE TABLE "quote_link_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "quote_link_request_email_idx" ON "quote_link_request" USING btree ("email","requested_at");