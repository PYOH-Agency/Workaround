import { pgTable, timestamp, text, uuid, index } from 'drizzle-orm/pg-core'

/**
 * Garde contre l'abus du renvoi de lien de devis.
 *
 * Un formulaire public qui declenche un e-mail est un vecteur d'envoi en masse
 * s'il n'est pas borne. On enregistre donc l'adresse et l'instant, le temps de
 * compter — **24 heures, pas davantage**, et la purge se fait a chaque ecriture
 * plutot que par une tache planifiee qu'on oublierait de surveiller.
 *
 * L'adresse est en clair : elle figure deja dans `customer`, la hacher ici
 * n'apporterait aucune protection et empecherait la purge par adresse en cas
 * de demande d'effacement.
 */
export const quoteLinkRequest = pgTable(
  'quote_link_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('quote_link_request_email_idx').on(table.email, table.requestedAt)],
)
