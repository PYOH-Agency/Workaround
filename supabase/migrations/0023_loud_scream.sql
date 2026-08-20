CREATE TABLE "screen_note_dismissal" (
	"user_id" uuid NOT NULL,
	"note_key" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "screen_note_dismissal_user_id_note_key_pk" PRIMARY KEY("user_id","note_key")
);
