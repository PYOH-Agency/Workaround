import { eq, isNull, like } from 'drizzle-orm'
import { db } from '@/db/client'
import { attestationRequest, company, insuranceCertificate } from '@/db/schema'
import { companySlug } from '@/domain/slug'
import { recordEvent } from '@/services/events'
import { sendCoveragePublished, sendNoAnswer } from '@/services/lead-mail'
import { publicProfile } from '@/services/public-profile'

/** Trente jours : la duree annoncee au demandeur dans sa confirmation d'envoi. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

type RequestPatch = Partial<typeof attestationRequest.$inferInsert>

/**
 * La passe quotidienne des demandes ouvertes.
 *
 * **L'attribution se fige ici, tant que le SIRET est encore la.**
 * L'anonymisation a trente jours l'efface — chez un entrepreneur individuel il
 * designe une personne physique — et rattacher une inscription apres coup
 * deviendrait impossible. Les jalons sont donc poses au fil de l'eau : ensuite
 * l'entonnoir compte des DATES, pas des entreprises, ce qui le rend insensible
 * a l'effacement.
 *
 * Rien ici ne modifie une visibilite : la passe ne fait qu'estampiller,
 * prevenir et effacer — c'est ce qui la rend incapable de faire diverger quoi
 * que ce soit. Meme philosophie que le cron d'echeances qui l'appelle.
 */
export async function advanceRequests(now: Date): Promise<void> {
  const open = await db
    .select()
    .from(attestationRequest)
    .where(isNull(attestationRequest.anonymizedAt))

  for (const request of open) {
    // Une demande sans SIRET a deja ete anonymisee par une passe qui n'a pas
    // pu poser `anonymized_at` : il n'y a plus rien a resoudre.
    if (!request.siret) continue

    const siren = request.siret.slice(0, 9)
    const [known] = await db
      .select({ id: company.id, legalName: company.legalName, siret: company.siret })
      .from(company)
      .where(like(company.siret, `${siren}%`))
      .limit(1)

    const patch: RequestPatch = {}

    if (known && !request.registeredAt) {
      patch.registeredAt = now
      patch.companyId = known.id
      await recordEvent({
        type: 'lead.registered',
        subjectType: 'attestation_request',
        subjectId: request.id,
        companyId: known.id,
        actorType: 'system',
      })
    }

    // Le depot compte QUEL QUE SOIT le statut : une attestation en attente de
    // relecture est une marche franchie par l'artisan, et l'entonnoir doit la
    // distinguer de l'absence de depot.
    if (known && !request.depositedAt) {
      const [deposit] = await db
        .select({ id: insuranceCertificate.id })
        .from(insuranceCertificate)
        .where(eq(insuranceCertificate.companyId, known.id))
        .limit(1)
      if (deposit) patch.depositedAt = now
    }

    const profile = known ? await publicProfile(siren, now) : null

    if (profile && !request.coveredAt) {
      patch.coveredAt = now
      await recordEvent({
        type: 'lead.covered',
        subjectType: 'attestation_request',
        subjectId: request.id,
        companyId: known!.id,
        actorType: 'system',
      })
    }

    // La suite promise au demandeur, une seule fois : c'est `coveredNotifiedAt`
    // qui le tient, et il s'ecrit dans la meme passe que l'envoi.
    if (profile && request.notify && request.requesterEmail && !request.coveredNotifiedAt) {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      await sendCoveragePublished({
        to: request.requesterEmail,
        requesterName: request.requesterName ?? 'Bonjour',
        companyName: known!.legalName,
        passportUrl: `${base}/artisan/${companySlug(known!.legalName, known!.siret)}`,
      })
      patch.coveredNotifiedAt = now
      // Le mail parti, les contacts n'ont plus de finalite : on efface du meme
      // geste plutot que de les garder jusqu'a l'echeance.
      Object.assign(patch, anonymized(now))
    }

    const expired = now.getTime() - request.requestedAt.getTime() >= MAX_AGE_MS

    /**
     * Les deux echeances peuvent tomber dans la meme passe. `patch.anonymizedAt`
     * dit alors que la bonne nouvelle vient de partir : ecrire « nous n'avons
     * rien recu » a quelqu'un a qui on vient d'annoncer l'attestation serait se
     * contredire dans la minute.
     */
    if (expired && !patch.anonymizedAt) {
      if (request.notify && request.requesterEmail && !request.expiryNotifiedAt) {
        await sendNoAnswer({
          to: request.requesterEmail,
          requesterName: request.requesterName ?? 'Bonjour',
        })
        patch.expiryNotifiedAt = now
      }
      Object.assign(patch, anonymized(now))
    }

    if (Object.keys(patch).length === 0) continue
    await db.update(attestationRequest).set(patch).where(eq(attestationRequest.id, request.id))
  }
}

/**
 * Ce que l'anonymisation efface : les contacts ET le SIRET.
 *
 * Elle ne touche a AUCUNE date. Les jalons et le canal survivent : la ligne
 * devient un compteur pur, et l'entonnoir donne le meme chiffre qu'avant.
 */
function anonymized(now: Date): RequestPatch {
  return {
    siret: null,
    requesterName: null,
    requesterEmail: null,
    artisanEmail: null,
    anonymizedAt: now,
  }
}
