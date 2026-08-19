import { and, desc, gte, isNull, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { attestationRequest, verificationLookup } from '@/db/schema'
import { funnel, type Funnel } from '@/domain/lead-funnel'

export interface OpenRequest {
  id: string
  siret: string | null
  channel: 'sent' | 'copied'
  requestedAt: Date
  registeredAt: Date | null
  depositedAt: Date | null
  coveredAt: Date | null
}

/**
 * L'entonnoir sur une periode, lu depuis la base.
 *
 * **Ne selectionne que des dates et des canaux — jamais un SIRET, jamais une
 * adresse.** Ce n'est pas une economie de colonnes, c'est la garantie qui
 * rend le calcul insensible a l'anonymisation : une demande videe de ses
 * contacts a 30 jours (voir `lead-advance.ts`) garde ses dates et son canal,
 * et doit peser exactement pareil dans le total. Si ce service se mettait un
 * jour a lire `siret` ou un email, une ligne anonymisee resterait comptable
 * mais une jointure ou un filtre sur ces colonnes romprait discretement cette
 * propriete — d'ou l'absence volontaire de toute colonne personnelle ici.
 */
export async function leadFunnel(from: Date, to: Date): Promise<Funnel> {
  const lookups = await db
    .select({ outcome: verificationLookup.outcome })
    .from(verificationLookup)
    .where(and(gte(verificationLookup.lookedUpAt, from), lte(verificationLookup.lookedUpAt, to)))

  const requests = await db
    .select({
      channel: attestationRequest.channel,
      registeredAt: attestationRequest.registeredAt,
      depositedAt: attestationRequest.depositedAt,
      coveredAt: attestationRequest.coveredAt,
    })
    .from(attestationRequest)
    .where(
      and(gte(attestationRequest.requestedAt, from), lte(attestationRequest.requestedAt, to)),
    )

  return funnel({ lookups, requests })
}

/**
 * Les demandes encore vivantes, la plus recente en tete.
 *
 * Une demande anonymisee n'a plus de contact a relancer : la liste s'en vide
 * d'elle-meme a 30 jours, sans purge dediee — c'est l'effet recherche.
 *
 * `now` n'entre dans aucun filtre ici : « vivante » se lit uniquement sur
 * `anonymized_at`, la meme frontiere que celle que `advanceRequests` pose.
 * Le parametre existe pour que l'appelant fournisse un instant explicite,
 * comme partout ailleurs dans ce service — pas pour un calcul d'echeance
 * qu'`advanceRequests` a deja fait.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function openRequests(now: Date): Promise<OpenRequest[]> {
  return db
    .select({
      id: attestationRequest.id,
      siret: attestationRequest.siret,
      channel: attestationRequest.channel,
      requestedAt: attestationRequest.requestedAt,
      registeredAt: attestationRequest.registeredAt,
      depositedAt: attestationRequest.depositedAt,
      coveredAt: attestationRequest.coveredAt,
    })
    .from(attestationRequest)
    .where(isNull(attestationRequest.anonymizedAt))
    .orderBy(desc(attestationRequest.requestedAt))
}
