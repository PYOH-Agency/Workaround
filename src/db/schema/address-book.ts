import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { activity } from './verification'
import { requester } from './requester'

/**
 * Une entreprise que le demandeur a saisie lui-meme.
 *
 * Le couvreur de 2019, l'electricien du voisin — celles que l'outil ne connait
 * pas. **Sans elles le repertoire est incomplet, donc inutile, donc il ne
 * fidelise personne.**
 *
 * `address_book`, et non `directory` : M4 a livre l'annuaire public sous ce
 * nom. Deux objets qui partagent un nom dans une meme base de code, c'est ainsi
 * que la confusion commence — et celle-ci porterait sur la frontiere la plus
 * sensible du produit, entre ce qui est public et ce qui ne l'est pas.
 *
 * **Cette table appartient au demandeur.** Elle n'est jamais lue cote
 * entreprise, jamais agregee, jamais exportee. Aucune invitation n'en part.
 * Cette ligne doit rester ecrite, sinon quelqu'un lira un jour cette table
 * comme une permission.
 */
export const addressBookEntry = pgTable(
  'address_book_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => requester.id),
    freeName: text('free_name').notNull(),
    phone: text('phone'),
    /** Facultative : il sait souvent « le couvreur », pas la nomenclature. */
    activityCode: text('activity_code').references(() => activity.code),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('address_book_requester_idx').on(t.requesterId)],
)
