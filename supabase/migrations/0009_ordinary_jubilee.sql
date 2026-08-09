CREATE TABLE "metric_dispute" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"public_token" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verdict" text,
	"answered_at" timestamp with time zone,
	CONSTRAINT "metric_dispute_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "metric_dispute_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "metric_statement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metric_statement_quote_id_unique" UNIQUE("quote_id")
);
--> statement-breakpoint
ALTER TABLE "metric_dispute" ADD CONSTRAINT "metric_dispute_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_dispute" ADD CONSTRAINT "metric_dispute_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_statement" ADD CONSTRAINT "metric_statement_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_statement" ADD CONSTRAINT "metric_statement_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "metric_dispute_company_idx" ON "metric_dispute" USING btree ("company_id");