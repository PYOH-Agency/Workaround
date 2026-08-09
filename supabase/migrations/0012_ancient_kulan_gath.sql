CREATE TABLE "address_book_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"free_name" text NOT NULL,
	"phone" text,
	"activity_code" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "address_book_entry" ADD CONSTRAINT "address_book_entry_requester_id_requester_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."requester"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_book_entry" ADD CONSTRAINT "address_book_entry_activity_code_activity_code_fk" FOREIGN KEY ("activity_code") REFERENCES "public"."activity"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "address_book_requester_idx" ON "address_book_entry" USING btree ("requester_id");