import { pgTable, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core'

/**
 * Les notices qu'une personne a refermees.
 *
 * **En base, pas dans le navigateur.** L'artisan saisit au bureau et consulte
 * sur le chantier : un rejet en `localStorage` lui reservirait chaque carte sur
 * le second appareil — l'inverse exact de ce que ces cartes existent pour
 * eviter.
 *
 * `user_id` d'`auth.users`, et non `member_id` ni `requester_id` : les deux
 * publics ont des notices, et une seule table vaut mieux que deux qui font la
 * meme chose. Aucune cle etrangere, comme partout ou l'on reference
 * `auth.users` : ce schema n'est pas le notre.
 *
 * Une ligne EST le rejet. Pas de colonne « rejete » a basculer : rouvrir, c'est
 * supprimer la ligne, et l'absence se lit sans ambiguite.
 */
export const screenNoteDismissal = pgTable(
  'screen_note_dismissal',
  {
    userId: uuid('user_id').notNull(),
    /** La cle du catalogue — voir `domain/screen-notes.ts`. */
    noteKey: text('note_key').notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.noteKey] })],
)
