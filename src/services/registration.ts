import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, member } from '@/db/schema'
import { findEstablishment } from './company-lookup'
import { recordEvent } from './events'

/**
 * Un refus d'inscription, distinct d'une panne.
 *
 * L'appelant l'affiche tel quel : le message dit a l'artisan ce qu'il peut
 * faire — demander une invitation, verifier son SIRET — la ou une trace de pile
 * ne lui dirait rien.
 */
export class RegistrationError extends Error {}

/**
 * L'entreprise et son proprietaire, en une fois.
 *
 * Vit dans `services` et non dans la page d'inscription : `/auth/confirm` doit
 * l'appeler, et une route ne peut pas importer une fonctionnalite sans faire
 * echouer le controle d'autonomie.
 *
 * **L'API est rappelee ici**, et c'est son resultat qui est ecrit — jamais ce
 * que l'ecran avait affiche. Entre la saisie du SIRET et l'ouverture du
 * courriel, l'etablissement a pu cesser, ou quelqu'un d'autre a pu inscrire
 * l'entreprise. L'intention ne porte qu'un SIRET, qui est une donnee publique.
 */
export async function createCompanyFor(userId: string, email: string, siret: string) {
  // Deja inscrit : le second clic sur le meme courriel ne doit ni echouer ni
  // creer une seconde entreprise.
  const existing = await db.query.member.findFirst({
    where: and(eq(member.userId, userId), isNull(member.removedAt)),
    with: { company: true },
  })
  if (existing) return existing.company

  const establishment = await findEstablishment(siret)

  if (!establishment.active) {
    throw new RegistrationError("Cet établissement n'est plus actif au répertoire des entreprises.")
  }

  const taken = await db.query.company.findFirst({
    where: eq(company.siret, establishment.siret),
  })
  if (taken) {
    throw new RegistrationError(
      'Cette entreprise est déjà inscrite. Demandez une invitation à son responsable.',
    )
  }

  const [created] = await db
    .insert(company)
    .values({
      siret: establishment.siret,
      legalName: establishment.legalName,
      legalForm: establishment.legalForm,
      addressLine1: establishment.addressLine1,
      postalCode: establishment.postalCode,
      city: establishment.city,
      foundedOn: establishment.foundedOn,
      // Prerempli depuis l'annuaire : autant de mentions obligatoires que
      // l'artisan n'aura pas a saisir, donc pas a saisir de travers.
      legalFormLabel: establishment.legalFormLabel,
      vatNumber: establishment.vatNumber,
    })
    .returning()

  await db.insert(member).values({
    companyId: created.id,
    userId,
    email,
    role: 'owner',
  })

  await recordEvent({
    type: 'company.created',
    subjectType: 'company',
    subjectId: created.id,
    companyId: created.id,
    actorType: 'company',
    actorId: userId,
    // Le RGE est releve des l'inscription : c'est l'une des habilitations
    // bloquantes de M3, et l'API la donne gratuitement.
    payload: { siret: created.siret, rge: establishment.rge },
  })

  return created
}
