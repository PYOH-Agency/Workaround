CREATE TABLE "requester" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"source" text DEFAULT 'signature' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requester_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "requester_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "signature" ADD COLUMN "requester_id" uuid;--> statement-breakpoint
ALTER TABLE "signature" ADD CONSTRAINT "signature_requester_id_requester_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."requester"("id") ON DELETE no action ON UPDATE no action;