import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { company } from './company'

/**
 * Un agenda externe raccorde.
 *
 * **Le seul secret que le produit conserve**, et il est volontairement le plus
 * etroit possible : `calendar.freebusy` chez Google, `Calendars.ReadBasic` chez
 * Microsoft. Ces portees ne rendent que des INTERVALLES d'occupation, sans
 * aucun titre — nous ne savons pas qu'il est chez le dentiste, nous savons
 * qu'il est pris.
 *
 * Apple n'y figure pas : son seul acces est CalDAV avec un mot de passe
 * d'application qui ouvre ses services iCloud. Ce serait un secret d'une autre
 * nature, et l'ecran dit pourquoi il n'est pas propose.
 *
 * `revoked_at` plutot qu'une suppression : savoir qu'un raccordement a existe
 * et a ete retire vaut mieux que de ne rien savoir.
 */
export const calendarConnection = pgTable(
  'calendar_connection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    provider: text('provider', { enum: ['google', 'microsoft'] }).notNull(),
    /** Pour qu'il sache QUEL compte est raccorde. */
    accountEmail: text('account_email').notNull(),
    /** Chiffre au repos — voir `src/lib/secrets.ts`. */
    refreshTokenEnc: text('refresh_token_enc').notNull(),
    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [unique('calendar_connection_uq').on(t.companyId, t.provider)],
)
