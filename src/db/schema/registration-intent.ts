import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Ce que la personne a saisi AVANT de recevoir son lien de connexion.
 *
 * **Reclamee par l'adresse, jamais par un jeton.** Meme doctrine que
 * `member_invitation` : « un jeton se transfere ; une boite aux lettres,
 * non ». Le lien magique prouve l'adresse, et c'est l'adresse qui retrouve
 * l'intention — ce qui la rend indifferente au changement d'appareil, cas
 * ordinaire puisque l'artisan saisit au bureau et ouvre son courriel sur son
 * telephone.
 *
 * Rien ne transite donc par l'URL du lien : `additional_redirect_urls`
 * n'accepte que des URL exactes, et le nom d'une personne n'a rien a faire
 * dans une chaine de requete, qui finit dans les journaux de serveur.
 *
 * Une adresse, une intention : la reinscription ecrase la precedente, c'est le
 * geste le plus recent qui vaut.
 */
export const registrationIntent = pgTable('registration_intent', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** **Toujours normalisee** — voir `normalizeEmail`. C'est la cle. */
  email: text('email').notNull().unique(),
  kind: text('kind', { enum: ['company', 'requester'] }).notNull(),
  /** `kind = 'company'`. Donnee publique : le repertoire des entreprises la publie. */
  siret: text('siret'),
  /** `kind = 'requester'`. `requester.name` est `notNull` et sert dans les courriels. */
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
