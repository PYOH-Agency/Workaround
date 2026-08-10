CREATE TABLE "situation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"invoice_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "situation_line" (
	"situation_id" uuid NOT NULL,
	"quote_line_id" uuid NOT NULL,
	"progress_percent" integer NOT NULL,
	CONSTRAINT "situation_line_pk" PRIMARY KEY("situation_id","quote_line_id")
);
--> statement-breakpoint
ALTER TABLE "situation" ADD CONSTRAINT "situation_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "situation" ADD CONSTRAINT "situation_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "situation" ADD CONSTRAINT "situation_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "situation_line" ADD CONSTRAINT "situation_line_situation_id_situation_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "situation_line" ADD CONSTRAINT "situation_line_quote_line_id_quote_line_id_fk" FOREIGN KEY ("quote_line_id") REFERENCES "public"."quote_line"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "situation_quote_idx" ON "situation" USING btree ("quote_id","number");