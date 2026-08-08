import { pgTable, uuid, text, timestamp, boolean, unique, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'

/**
 * Le referentiel d'activites. C'est une DONNEE : il s'alimente par migration
 * (9004) et s'enrichit sans toucher au schema ni redeployer.
 */
export const activity = pgTable('activity', {
  code: text('code').primaryKey(),
  label: text('label').notNull(),
  family: text('family', {
    enum: ['site', 'structure', 'envelope', 'fitting', 'technical'],
  }).notNull(),
  // Renseigne activite par activite : la nomenclature contient des entrees qui
  // n'engagent pas l'article 1792 du Code civil.
  requiresDecennale: boolean('requires_decennale').notNull(),
})

/** Ce que l'entreprise declare exercer. Declaratif — la couverture, elle, se prouve. */
export const companyActivity = pgTable(
  'company_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    activityCode: text('activity_code')
      .notNull()
      .references(() => activity.code),
    declaredAt: timestamp('declared_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('company_activity_uq').on(t.companyId, t.activityCode)],
)

/**
 * Une attestation deposee par l'artisan.
 *
 * Ce que nous ne pouvons recuperer nulle part — API Entreprise nous est fermee —
 * l'artisan le fournit. Le fichier vit dans un compartiment prive ; seul son
 * chemin est ici.
 */
export const insuranceCertificate = pgTable(
  'insurance_certificate',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    kind: text('kind', { enum: ['decennale', 'rc_pro'] }).notNull(),
    storagePath: text('storage_path').notNull(),
    insurerName: text('insurer_name'),
    policyNumber: text('policy_number'),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    status: text('status', { enum: ['pending', 'validated', 'rejected'] })
      .notNull()
      .default('pending'),
    /** Motif communique a l'artisan en cas de rejet. Jamais de refus muet. */
    rejectionReason: text('rejection_reason'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('certificate_company_idx').on(t.companyId)],
)

/**
 * La correspondance entre une attestation et une activite du referentiel.
 *
 * **C'est l'acte qui engage.** Lire « Plomberie — installations sanitaires » sur
 * un PDF est facile ; decider si cela couvre la pose d'un chauffe-eau
 * thermodynamique est difficile, et c'est cette decision qu'un demandeur
 * utilisera. Elle est donc toujours humaine, et toujours tracee.
 */
export const certificateActivity = pgTable(
  'certificate_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    certificateId: uuid('certificate_id')
      .notNull()
      .references(() => insuranceCertificate.id),
    activityCode: text('activity_code')
      .notNull()
      .references(() => activity.code),
    /** Le libelle exact lu sur l'attestation, conserve tel quel. */
    sourceLabel: text('source_label').notNull(),
    confirmedBy: uuid('confirmed_by').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('certificate_activity_uq').on(t.certificateId, t.activityCode)],
)

/** Resultat date d'un controle automatique sur une source ouverte. */
export const legalCheck = pgTable(
  'legal_check',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    source: text('source', { enum: ['sirene', 'bodacc', 'rge'] }).notNull(),
    status: text('status', { enum: ['active', 'blocked'] }).notNull(),
    detail: text('detail'),
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('legal_check_company_idx').on(t.companyId, t.source)],
)

export const activityRelations = relations(activity, ({ many }) => ({
  companies: many(companyActivity),
}))

export const companyActivityRelations = relations(companyActivity, ({ one }) => ({
  company: one(company, { fields: [companyActivity.companyId], references: [company.id] }),
  activity: one(activity, { fields: [companyActivity.activityCode], references: [activity.code] }),
}))

export const insuranceCertificateRelations = relations(insuranceCertificate, ({ one, many }) => ({
  company: one(company, { fields: [insuranceCertificate.companyId], references: [company.id] }),
  activities: many(certificateActivity),
}))

export const certificateActivityRelations = relations(certificateActivity, ({ one }) => ({
  certificate: one(insuranceCertificate, {
    fields: [certificateActivity.certificateId],
    references: [insuranceCertificate.id],
  }),
  activity: one(activity, {
    fields: [certificateActivity.activityCode],
    references: [activity.code],
  }),
}))
