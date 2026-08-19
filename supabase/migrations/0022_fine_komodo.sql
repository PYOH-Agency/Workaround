CREATE TABLE "attestation_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siret" text,
	"company_id" uuid,
	"requester_name" text,
	"requester_email" text,
	"artisan_email" text,
	"channel" text NOT NULL,
	"notify" boolean DEFAULT false NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"registered_at" timestamp with time zone,
	"deposited_at" timestamp with time zone,
	"covered_at" timestamp with time zone,
	"covered_notified_at" timestamp with time zone,
	"expiry_notified_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mail_optout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_optout_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_lookup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siret" text NOT NULL,
	"outcome" text NOT NULL,
	"entry" text NOT NULL,
	"looked_up_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "attestation_request_siret_idx" ON "attestation_request" USING btree ("siret","requested_at");--> statement-breakpoint
CREATE INDEX "attestation_request_artisan_idx" ON "attestation_request" USING btree ("artisan_email","requested_at");--> statement-breakpoint
CREATE INDEX "attestation_request_requester_idx" ON "attestation_request" USING btree ("requester_email","requested_at");--> statement-breakpoint
CREATE INDEX "attestation_request_open_idx" ON "attestation_request" USING btree ("anonymized_at","requested_at");--> statement-breakpoint
CREATE INDEX "verification_lookup_at_idx" ON "verification_lookup" USING btree ("looked_up_at");