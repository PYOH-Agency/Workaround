import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Relecteurs internes.
 *
 * Distincts de `member`, qui rattache un utilisateur a une entreprise cliente :
 * un relecteur n'appartient a aucune entreprise artisanale. Les confondre
 * donnerait a un artisan le pouvoir de valider sa propre attestation.
 */
export const staff = pgTable('staff', {
  /** Identifiant dans auth.users de Supabase. */
  userId: uuid('user_id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
