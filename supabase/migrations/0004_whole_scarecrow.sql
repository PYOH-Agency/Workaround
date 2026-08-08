CREATE TABLE "activity" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"family" text NOT NULL,
	"requires_decennale" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificate_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" uuid NOT NULL,
	"activity_code" text NOT NULL,
	"source_label" text NOT NULL,
	"confirmed_by" uuid NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificate_activity_uq" UNIQUE("certificate_id","activity_code")
);
--> statement-breakpoint
CREATE TABLE "company_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"activity_code" text NOT NULL,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_activity_uq" UNIQUE("company_id","activity_code")
);
--> statement-breakpoint
CREATE TABLE "insurance_certificate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"storage_path" text NOT NULL,
	"insurer_name" text,
	"policy_number" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "certificate_activity" ADD CONSTRAINT "certificate_activity_certificate_id_insurance_certificate_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."insurance_certificate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_activity" ADD CONSTRAINT "certificate_activity_activity_code_activity_code_fk" FOREIGN KEY ("activity_code") REFERENCES "public"."activity"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_activity" ADD CONSTRAINT "company_activity_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_activity" ADD CONSTRAINT "company_activity_activity_code_activity_code_fk" FOREIGN KEY ("activity_code") REFERENCES "public"."activity"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_certificate" ADD CONSTRAINT "insurance_certificate_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_check" ADD CONSTRAINT "legal_check_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certificate_company_idx" ON "insurance_certificate" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "legal_check_company_idx" ON "legal_check" USING btree ("company_id","source");