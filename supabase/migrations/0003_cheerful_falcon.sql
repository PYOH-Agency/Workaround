CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"quote_id" uuid,
	"number" text NOT NULL,
	"type" text NOT NULL,
	"corrects_invoice_id" uuid,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"total_excl_tax" integer NOT NULL,
	"total_tax" integer NOT NULL,
	"total_incl_tax" integer NOT NULL,
	"late_payment_rate" text NOT NULL,
	"recovery_indemnity" integer NOT NULL,
	"operation_type" text NOT NULL,
	"public_token" text NOT NULL,
	CONSTRAINT "invoice_public_token_unique" UNIQUE("public_token"),
	CONSTRAINT "invoice_number_uq" UNIQUE("company_id","number")
);
--> statement-breakpoint
CREATE TABLE "invoice_counter" (
	"company_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "invoice_counter_pk" PRIMARY KEY("company_id","year")
);
--> statement-breakpoint
CREATE TABLE "invoice_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"unit" text DEFAULT 'u' NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price_excl_tax" integer NOT NULL,
	"tax_rate" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "late_payment_rate" text DEFAULT 'trois fois le taux d’intérêt légal';--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "operation_type" text DEFAULT 'services' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_corrects_invoice_id_invoice_id_fk" FOREIGN KEY ("corrects_invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_counter" ADD CONSTRAINT "invoice_counter_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_project_idx" ON "invoice" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoice_quote_idx" ON "invoice" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "payment_invoice_idx" ON "payment" USING btree ("invoice_id");