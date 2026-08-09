CREATE TABLE "anomaly_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"subject_id" text NOT NULL,
	"facts_fingerprint" text NOT NULL,
	"verdict" text NOT NULL,
	"note" text NOT NULL,
	"reviewed_by" uuid NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anomaly_review_uq" UNIQUE("type","subject_id","facts_fingerprint")
);
--> statement-breakpoint
CREATE INDEX "anomaly_review_type_idx" ON "anomaly_review" USING btree ("type");