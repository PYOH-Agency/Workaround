CREATE TABLE "contact_throttle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "need" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"activity_code" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "need" ADD CONSTRAINT "need_activity_code_activity_code_fk" FOREIGN KEY ("activity_code") REFERENCES "public"."activity"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_throttle_idx" ON "contact_throttle" USING btree ("ip_hash","created_at");