import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { quote } from './quote'

/**
 * Ce que l'artisan publie sur son chantier, a destination de son client.
 *
 * **Definitive.** Ni modification ni suppression — imposees par declencheur,
 * comme la facture et le journal. Un fil reecrivable ne vaudrait rien comme
 * trace, et l'artisan doit savoir en ecrivant que son client a lu. Une erreur
 * se corrige par une publication qui la rectifie, comme un avoir corrige une
 * facture.
 */
export const chantierPost = pgTable(
  'chantier_post',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** La RACINE de la chaine de versions, comme les factures et la fin de chantier. */
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quote.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chantier_post_quote_idx').on(t.quoteId)],
)

/**
 * Les photos d'une publication.
 *
 * Elles montrent l'interieur du logement de quelqu'un : depot PRIVE, jamais
 * servi directement, et **aucune duree de conservation propre** — elles suivent
 * le sort du chantier. Leur donner une vie autonome ferait un album, c'est-a-dire
 * un autre produit.
 */
export const chantierPhoto = pgTable('chantier_photo', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => chantierPost.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const chantierPostRelations = relations(chantierPost, ({ one, many }) => ({
  quote: one(quote, { fields: [chantierPost.quoteId], references: [quote.id] }),
  photos: many(chantierPhoto),
}))

export const chantierPhotoRelations = relations(chantierPhoto, ({ one }) => ({
  post: one(chantierPost, { fields: [chantierPhoto.postId], references: [chantierPost.id] }),
}))
