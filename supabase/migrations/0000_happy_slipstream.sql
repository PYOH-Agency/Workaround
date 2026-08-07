CREATE TABLE "chantier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entreprise_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"logement_id" uuid NOT NULL,
	"libelle" text NOT NULL,
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entreprise_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"email" text NOT NULL,
	"telephone" text,
	"type" text DEFAULT 'particulier' NOT NULL,
	"siret" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_signature" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devis_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"telephone" text NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"tentatives" integer DEFAULT 0 NOT NULL,
	"valide_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"delai_engage_jours" integer,
	"total_ht" integer DEFAULT 0 NOT NULL,
	"total_tva" integer DEFAULT 0 NOT NULL,
	"total_ttc" integer DEFAULT 0 NOT NULL,
	"token_public" text NOT NULL,
	"envoye_le" timestamp with time zone,
	"signe_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devis_token_public_unique" UNIQUE("token_public"),
	CONSTRAINT "devis_numero_version_uq" UNIQUE("numero","version")
);
--> statement-breakpoint
CREATE TABLE "ligne_devis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devis_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"libelle" text NOT NULL,
	"unite" text DEFAULT 'u' NOT NULL,
	"quantite" numeric(12, 3) NOT NULL,
	"prix_unitaire_ht" integer NOT NULL,
	"taux_tva" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devis_id" uuid NOT NULL,
	"nom_signataire" text NOT NULL,
	"email_signataire" text NOT NULL,
	"telephone_signataire" text NOT NULL,
	"code_valide_le" timestamp with time zone NOT NULL,
	"adresse_ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"hash_document" text NOT NULL,
	"chemin_pdf_archive" text NOT NULL,
	"jeton_horodatage" text,
	"signe_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signature_devis_id_unique" UNIQUE("devis_id")
);
--> statement-breakpoint
CREATE TABLE "entreprise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siret" text NOT NULL,
	"raison_sociale" text NOT NULL,
	"forme_juridique" text,
	"adresse_ligne1" text,
	"code_postal" text,
	"ville" text,
	"date_creation_entreprise" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entreprise_siret_unique" UNIQUE("siret")
);
--> statement-breakpoint
CREATE TABLE "logement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empreinte" text NOT NULL,
	"adresse_ligne1" text NOT NULL,
	"complement" text,
	"code_postal" text NOT NULL,
	"ville" text NOT NULL,
	"annee_construction" integer,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logement_empreinte_unique" UNIQUE("empreinte")
);
--> statement-breakpoint
CREATE TABLE "membre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entreprise_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"email" text NOT NULL,
	"nom" text,
	"role" text DEFAULT 'proprietaire' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membre_utilisateur_id_unique" UNIQUE("utilisateur_id")
);
--> statement-breakpoint
CREATE TABLE "evenement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"entreprise_id" uuid,
	"sujet_type" text NOT NULL,
	"sujet_id" uuid NOT NULL,
	"acteur_type" text NOT NULL,
	"acteur_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"horodate_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chantier" ADD CONSTRAINT "chantier_entreprise_id_entreprise_id_fk" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chantier" ADD CONSTRAINT "chantier_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chantier" ADD CONSTRAINT "chantier_logement_id_logement_id_fk" FOREIGN KEY ("logement_id") REFERENCES "public"."logement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_entreprise_id_entreprise_id_fk" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_signature" ADD CONSTRAINT "code_signature_devis_id_devis_id_fk" FOREIGN KEY ("devis_id") REFERENCES "public"."devis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devis" ADD CONSTRAINT "devis_chantier_id_chantier_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ligne_devis" ADD CONSTRAINT "ligne_devis_devis_id_devis_id_fk" FOREIGN KEY ("devis_id") REFERENCES "public"."devis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature" ADD CONSTRAINT "signature_devis_id_devis_id_fk" FOREIGN KEY ("devis_id") REFERENCES "public"."devis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membre" ADD CONSTRAINT "membre_entreprise_id_entreprise_id_fk" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "logement_code_postal_idx" ON "logement" USING btree ("code_postal");--> statement-breakpoint
CREATE INDEX "evenement_entreprise_idx" ON "evenement" USING btree ("entreprise_id","horodate_le");--> statement-breakpoint
CREATE INDEX "evenement_sujet_idx" ON "evenement" USING btree ("sujet_type","sujet_id");