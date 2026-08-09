import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, addressBookEntry, company, project, quote, signature } from '@/db/schema'
import {
  mergeAddressBook,
  type AddressBookEntry,
  type PastIntervention,
} from '@/domain/address-book'
import { companySlug } from '@/domain/slug'
import { companyCoverage } from '@/services/visibility'
import { recordEvent } from '@/services/events'

export const MAX_FREE_NAME_LENGTH = 120
export const MAX_NOTE_LENGTH = 300

/** Ce qu'on ajoute a une entree d'entreprise : son etat de verification. */
export interface CoverageBadge {
  /** Les activites couvertes aujourd'hui, et elles seules. */
  covered: string[]
  /** Les activites declarees mais plus couvertes. C'est ce qu'il DOIT voir. */
  lapsed: string[]
  /** `null` si l'entreprise n'a plus de page publique. */
  passportPath: string | null
}

export type BookEntry = AddressBookEntry & { coverage?: CoverageBadge }

/**
 * Le carnet du demandeur : ce qu'il a vecu, et ce qu'il a saisi.
 *
 * **Le statut de verification est celui d'AUJOURD'HUI**, pas celui du chantier.
 * C'est ce qui fait vivre le label apres la vente : si la decennale d'une
 * entreprise a expire depuis, il le voit. Rien n'est stocke — un drapeau
 * mentirait des le lendemain de l'expiration.
 */
export async function addressBookFor(requesterId: string, now: Date): Promise<BookEntry[]> {
  const rows = await db
    .select({
      companyId: company.id,
      companyName: company.legalName,
      siret: company.siret,
      chantierLabel: project.label,
      at: quote.signedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(project, eq(project.id, quote.projectId))
    .innerJoin(company, eq(company.id, quote.companyId))
    // La condition d'acces est portee par la requete, comme partout ailleurs.
    .where(eq(signature.requesterId, requesterId))

  const interventions: PastIntervention[] = rows
    .filter((row) => row.at !== null)
    .map((row) => ({
      companyId: row.companyId,
      companyName: row.companyName,
      chantierLabel: row.chantierLabel,
      at: row.at!,
    }))

  const typed = await db
    .select({
      id: addressBookEntry.id,
      freeName: addressBookEntry.freeName,
      phone: addressBookEntry.phone,
      activityLabel: activity.label,
      note: addressBookEntry.note,
      createdAt: addressBookEntry.createdAt,
    })
    .from(addressBookEntry)
    .leftJoin(activity, eq(activity.code, addressBookEntry.activityCode))
    .where(eq(addressBookEntry.requesterId, requesterId))

  const merged = mergeAddressBook(interventions, typed)
  const siretOf = new Map(rows.map((row) => [row.companyId, row.siret]))

  // Un appel par entreprise. Le carnet en compte quelques-unes : le jour ou il
  // en compterait des dizaines, ce serait un autre produit.
  return Promise.all(
    merged.map(async (entry) => {
      if (entry.kind !== 'company') return entry

      const coverage = await companyCoverage(entry.companyId, now)

      return {
        ...entry,
        coverage: {
          covered: coverage.activities.filter((a) => a.visible).map((a) => a.label),
          // Ce qu'il DOIT voir : taire une attestation expiree serait l'exact
          // contraire du service rendu.
          lapsed: coverage.activities.filter((a) => !a.visible).map((a) => a.label),
          passportPath: coverage.isPublic
            ? `/p/${companySlug(entry.name, siretOf.get(entry.companyId)!)}`
            : null,
        },
      }
    }),
  )
}

/**
 * Ajoute une entreprise que nous ne connaissons pas.
 *
 * **Aucune invitation n'est envoyee.** On n'a qu'un seul premier contact avec
 * un artisan, et « votre client vous a ajoute a son repertoire » vaudra en P2,
 * accompagne d'une demande reelle. Le depenser ici pour proposer un logiciel de
 * devis, c'est griller le meilleur signal d'acquisition qui existe.
 */
export async function addManualEntry(input: {
  requesterId: string
  freeName: string
  phone: string
  activityCode: string | null
  note: string
}) {
  const freeName = input.freeName.trim()
  if (!freeName) throw new Error('Le nom est obligatoire')
  if (freeName.length > MAX_FREE_NAME_LENGTH) throw new Error('Ce nom est trop long')
  if (input.note.trim().length > MAX_NOTE_LENGTH) throw new Error('Cette note est trop longue')

  const [created] = await db
    .insert(addressBookEntry)
    .values({
      requesterId: input.requesterId,
      freeName,
      phone: input.phone.trim() || null,
      activityCode: input.activityCode,
      note: input.note.trim() || null,
    })
    .returning()

  // Le journal porte le FAIT, jamais ce qu'il a saisi : ni le nom, ni le
  // telephone d'un tiers qui n'a rien demande et qui ne peut pas s'y opposer.
  await recordEvent({
    type: 'address_book.entry_added',
    subjectType: 'requester',
    subjectId: input.requesterId,
    actorType: 'customer',
    actorId: input.requesterId,
    payload: { withPhone: Boolean(input.phone.trim()) },
  })

  return created
}

/** Une entree d'entreprise du carnet, pour sa fiche. Rendue au seul proprietaire. */
export async function bookedCompany(requesterId: string, companyId: string, now: Date) {
  const [found] = await db
    .select({ phone: company.phone, number: quote.number })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(company, eq(company.id, quote.companyId))
    .where(and(eq(signature.requesterId, requesterId), eq(quote.companyId, companyId)))
    .orderBy(quote.signedAt)
    .limit(1)

  if (!found) return null

  const entry = (await addressBookFor(requesterId, now)).find(
    (e) => e.kind === 'company' && e.companyId === companyId,
  )

  return entry ? { ...entry, phone: found.phone, previousQuoteNumber: found.number } : null
}
