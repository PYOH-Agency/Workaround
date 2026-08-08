import { pgTable, uuid, text, timestamp, unique, index } from 'drizzle-orm/pg-core'

/**
 * L'examen humain d'une anomalie.
 *
 * **La seule chose qu'on stocke.** Les anomalies elles-memes se calculent a
 * chaque lecture ; ne survit que la trace de ce qu'un humain a juge.
 *
 * `facts_fingerprint` est ce qui empeche l'aveuglement : l'examen ne masque
 * l'anomalie que tant que les faits sont les memes. Un fait nouveau la fait
 * resurgir.
 */
export const anomalyReview = pgTable(
  'anomaly_review',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type', {
      enum: ['certificate_waiting', 'unreachable_company', 'source_silent', 'shared_signer'],
    }).notNull(),
    subjectId: text('subject_id').notNull(),
    factsFingerprint: text('facts_fingerprint').notNull(),
    /**
     * `confirmed` n'entraine AUCUNE action automatique. Il enregistre qu'un
     * humain a constate un probleme reel ; la suite releve de gestes distincts
     * et traces.
     */
    verdict: text('verdict', { enum: ['benign', 'confirmed'] }).notNull(),
    /** Obligatoire : un verdict sans raison ne vaut rien six mois plus tard. */
    note: text('note').notNull(),
    reviewedBy: uuid('reviewed_by').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('anomaly_review_uq').on(t.type, t.subjectId, t.factsFingerprint),
    index('anomaly_review_type_idx').on(t.type),
  ],
)
