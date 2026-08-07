import { pgTable, uuid, text, timestamp, integer, numeric, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { chantier } from './chantier'

export const devis = pgTable(
  'devis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chantierId: uuid('chantier_id')
      .notNull()
      .references(() => chantier.id),
    numero: text('numero').notNull(),
    version: integer('version').notNull().default(1),
    statut: text('statut', { enum: ['brouillon', 'envoye', 'signe', 'refuse', 'expire'] })
      .notNull()
      .default('brouillon'),
    // Engagement de delai en jours ouvres. Obligatoire a l'envoi : sans lui, la
    // metrique « respect du delai annonce » du passeport n'a rien a comparer.
    delaiEngageJours: integer('delai_engage_jours'),
    totalHT: integer('total_ht').notNull().default(0),
    totalTVA: integer('total_tva').notNull().default(0),
    totalTTC: integer('total_ttc').notNull().default(0),
    tokenPublic: text('token_public').notNull().unique(),
    envoyeLe: timestamp('envoye_le', { withTimezone: true }),
    signeLe: timestamp('signe_le', { withTimezone: true }),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('devis_numero_version_uq').on(t.numero, t.version)],
)

export const ligneDevis = pgTable('ligne_devis', {
  id: uuid('id').primaryKey().defaultRandom(),
  devisId: uuid('devis_id')
    .notNull()
    .references(() => devis.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  libelle: text('libelle').notNull(),
  unite: text('unite').notNull().default('u'),
  quantite: numeric('quantite', { precision: 12, scale: 3 }).notNull(),
  prixUnitaireHT: integer('prix_unitaire_ht').notNull(),
  tauxTVA: integer('taux_tva').notNull(),
})

/** Code a usage unique envoye par SMS. Le code n'est jamais stocke en clair. */
export const codeSignature = pgTable('code_signature', {
  id: uuid('id').primaryKey().defaultRandom(),
  devisId: uuid('devis_id')
    .notNull()
    .references(() => devis.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  telephone: text('telephone').notNull(),
  expireLe: timestamp('expire_le', { withTimezone: true }).notNull(),
  tentatives: integer('tentatives').notNull().default(0),
  valideLe: timestamp('valide_le', { withTimezone: true }),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Piste d'audit de la signature.
 *
 * En signature electronique simple, la presomption de fiabilite de l'article
 * 1367 al. 2 ne s'applique pas : la charge de la preuve pese sur celui qui s'en
 * prevaut. Cette table doit donc etablir separement les trois elements exiges :
 * l'integrite de l'acte, l'identification du signataire, et le lien entre les
 * deux.
 */
export const signature = pgTable('signature', {
  id: uuid('id').primaryKey().defaultRandom(),
  devisId: uuid('devis_id')
    .notNull()
    .references(() => devis.id)
    .unique(),
  nomSignataire: text('nom_signataire').notNull(),
  emailSignataire: text('email_signataire').notNull(),
  telephoneSignataire: text('telephone_signataire').notNull(),
  // Identification : horodatage de la validation du code SMS.
  codeValideLe: timestamp('code_valide_le', { withTimezone: true }).notNull(),
  adresseIp: text('adresse_ip').notNull(),
  userAgent: text('user_agent').notNull(),
  // Integrite : empreinte du PDF exact soumis a la signature...
  hashDocument: text('hash_document').notNull(),
  // ...et chemin de son archive. Regenerer le PDF depuis un gabarit modifie
  // produirait un document different et invaliderait l'empreinte en silence.
  cheminPdfArchive: text('chemin_pdf_archive').notNull(),
  // Lien : l'empreinte scellee dans un jeton d'horodatage RFC 3161.
  jetonHorodatage: text('jeton_horodatage'),
  signeLe: timestamp('signe_le', { withTimezone: true }).notNull().defaultNow(),
})

export const devisRelations = relations(devis, ({ one, many }) => ({
  chantier: one(chantier, { fields: [devis.chantierId], references: [chantier.id] }),
  lignes: many(ligneDevis),
  codes: many(codeSignature),
  signature: one(signature),
}))

export const ligneDevisRelations = relations(ligneDevis, ({ one }) => ({
  devis: one(devis, { fields: [ligneDevis.devisId], references: [devis.id] }),
}))

export const codeSignatureRelations = relations(codeSignature, ({ one }) => ({
  devis: one(devis, { fields: [codeSignature.devisId], references: [devis.id] }),
}))

export const signatureRelations = relations(signature, ({ one }) => ({
  devis: one(devis, { fields: [signature.devisId], references: [devis.id] }),
}))
