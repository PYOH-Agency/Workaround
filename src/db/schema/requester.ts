import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Le demandeur : la personne qui a signe.
 *
 * **Cree par la signature, silencieusement.** Le compte nait de l'acte sans le
 * conditionner : ajouter une etape a l'ecran de signature couterait des
 * signatures, et la signature est ce qui alimente le passeport, les metriques
 * et le label.
 *
 * `user_id` reste vide jusqu'a la premiere connexion : la ligne existe avant
 * que la personne n'ait jamais ouvert l'application, et c'est voulu — le jour
 * ou une seconde entreprise intervient chez elle, son dossier est deja
 * constitue.
 */
export const requester = pgTable('requester', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Identifiant dans `auth.users` de Supabase. Revendique a la 1re connexion. */
  userId: uuid('user_id').unique(),
  /** **Toujours normalisee** — voir `normalizeEmail`. C'est la cle d'identite. */
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /**
   * `signature` — il a signe un devis. `invitation` — un artisan l'a rattache a
   * un logement existant, notamment un bailleur multi-lots. `self` — il a cree
   * son compte de lui-meme, sans avoir jamais signe.
   *
   * `self` ne se confond pas avec `invitation` : les reunir ferait mentir la
   * colonne sur son propre contenu, et c'est elle qui dira un jour d'ou viennent
   * les comptes.
   */
  source: text('source', { enum: ['signature', 'invitation', 'self'] })
    .notNull()
    .default('signature'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
