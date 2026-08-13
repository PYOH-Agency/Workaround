ALTER TABLE "quote" ADD COLUMN "reception_reserves" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "reserves_lifted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "reserves_lifted_by" uuid;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_reserves_lifted_by_requester_id_fk" FOREIGN KEY ("reserves_lifted_by") REFERENCES "public"."requester"("id") ON DELETE no action ON UPDATE no action;