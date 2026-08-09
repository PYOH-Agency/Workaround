CREATE TABLE "chantier_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chantier_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "received_by" uuid;--> statement-breakpoint
ALTER TABLE "chantier_photo" ADD CONSTRAINT "chantier_photo_post_id_chantier_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."chantier_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chantier_post" ADD CONSTRAINT "chantier_post_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chantier_post" ADD CONSTRAINT "chantier_post_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chantier_post_quote_idx" ON "chantier_post" USING btree ("quote_id");--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_received_by_requester_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."requester"("id") ON DELETE no action ON UPDATE no action;