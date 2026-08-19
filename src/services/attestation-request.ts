import { and, eq, gt, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { attestationRequest, mailOptout } from '@/db/schema'
import type { RequestChannel } from '@/domain/lead'
import { guardVerdict, type GuardVerdict } from '@/domain/lead-guards'
import { optoutToken } from '@/domain/mail-optout'
import { normalizeEmail } from '@/domain/requester'
import { activeQualifications } from '@/domain/rge'
import { isValidSiret } from '@/domain/siret'
import { recordEvent } from '@/services/events'
import { sendAttestationRequest, sendRequestConfirmation } from '@/services/lead-mail'
import { fetchRgeRows } from '@/services/rge-lookup'
import { classifySiret } from '@/services/verification-lookup'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export interface RequestInput {
  siret: string
  channel: RequestChannel
  notify: boolean
  requesterName?: string
  requesterEmail?: string
  artisanEmail?: string
}

/**
 * Enregistre une demande d'attestation, si les gardes le permettent.
 *
 * En canal `copied`, **aucun contact n'est enregistre et aucun mail ne part** :
 * seule l'intention compte, et elle ne consomme pas la treve de sept jours de
 * l'artisan puisqu'elle ne lui envoie rien.
 *
 * Le verdict est rendu tel quel a l'appelant, qui decide quoi en dire. On ne
 * distingue jamais, dans le message affiche, un refus d'un envoi reussi lorsque
 * cela reviendrait a reveler qu'un autre demandeur est passe avant.
 *
 * **Un refus n'ecrit rien.** Une ligne posee sur un refus alimenterait
 * elle-meme les trois fenetres, et transformerait un refus passager en
 * auto-blocage permanent — sans qu'aucun mail ne soit jamais parti.
 */
export async function createRequest(input: RequestInput, now: Date): Promise<GuardVerdict> {
  // La garde vit ici, avant les deux branches, et pas seulement dans
  // `classifySiret` : le canal `copied` ne classe rien, et une intention posee
  // sur un SIRET invalide creerait une ligne que l'entonnoir ne peut plus
  // rattacher a personne. Une exception, comme dans `classifySiret` : une
  // entree non validee est un defaut de programmation, pas un cas d'usage.
  if (!isValidSiret(input.siret)) throw new Error(`SIRET invalide : ${input.siret}`)

  if (input.channel === 'copied') {
    await db.insert(attestationRequest).values({
      siret: input.siret,
      channel: 'copied',
      notify: false,
      requestedAt: now,
    })
    return 'ok'
  }

  // `normalizeEmail` plutot qu'un `toLowerCase` local : c'est l'invariant que
  // le schema annonce sur ces deux colonnes, et il n'existe qu'a un endroit.
  const requesterEmail = normalizeEmail(input.requesterEmail ?? '')
  const artisanEmail = normalizeEmail(input.artisanEmail ?? '')

  // La comparaison est insensible a la casse cote base, comme dans
  // `resendQuoteLinks` : l'invariant de normalisation est tenu a l'ecriture,
  // mais une ligne posee avant lui contournerait sinon l'opposition.
  const [opposed] = await db
    .select({ id: mailOptout.id })
    .from(mailOptout)
    .where(eq(sql`lower(${mailOptout.email})`, artisanEmail))
    .limit(1)

  // Seuls les envois reels consomment la treve de l'artisan : `artisan_email`
  // n'est renseigne qu'en canal `sent`, jamais par une intention de copie.
  const artisanMails = await db
    .select({ at: attestationRequest.requestedAt })
    .from(attestationRequest)
    .where(
      and(
        eq(sql`lower(${attestationRequest.artisanEmail})`, artisanEmail),
        gt(attestationRequest.requestedAt, new Date(now.getTime() - WEEK_MS)),
      ),
    )

  const coupleRequests = await db
    .select({ at: attestationRequest.requestedAt })
    .from(attestationRequest)
    .where(
      and(
        eq(attestationRequest.siret, input.siret),
        eq(sql`lower(${attestationRequest.requesterEmail})`, requesterEmail),
        gt(attestationRequest.requestedAt, new Date(now.getTime() - DAY_MS)),
      ),
    )

  const requesterRequests = await db
    .select({ at: attestationRequest.requestedAt })
    .from(attestationRequest)
    .where(
      and(
        eq(sql`lower(${attestationRequest.requesterEmail})`, requesterEmail),
        gt(attestationRequest.requestedAt, new Date(now.getTime() - HOUR_MS)),
      ),
    )

  const verdict = guardVerdict({
    now,
    optedOut: Boolean(opposed),
    artisanMails: artisanMails.map((r) => r.at),
    coupleRequests: coupleRequests.map((r) => r.at),
    requesterRequests: requesterRequests.map((r) => r.at),
  })

  if (verdict !== 'ok') return verdict

  const { outcome } = await classifySiret(input.siret, now)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const pageUrl = `${base}/verification/${input.siret}`

  /**
   * Le lien d'opposition est signe AVANT toute ecriture, et volontairement pas
   * dans un try/catch : `optoutToken` leve si `MAIL_OPTOUT_SECRET` est absent,
   * et sans lien d'opposition l'interet legitime ne tient pas — un mail ampute
   * de ce lien est un mail qu'on n'a pas le droit d'envoyer. Le signer ici
   * plutot qu'au moment de l'envoi garantit qu'une configuration incomplete ne
   * laisse derriere elle ni ligne en base ni treve consommee : elle echoue
   * bruyamment, sans effet de bord.
   */
  const optoutUrl = `${base}/stop?e=${encodeURIComponent(artisanEmail)}&s=${optoutToken(
    artisanEmail,
    process.env.MAIL_OPTOUT_SECRET ?? '',
  )}`

  // L'ecriture precede l'envoi : un mail parti sans sa ligne laisse les trois
  // fenetres vides, et les gardes ne freinent plus rien au prochain passage.
  const [row] = await db
    .insert(attestationRequest)
    .values({
      siret: input.siret,
      channel: 'sent',
      notify: input.notify,
      requesterName: input.requesterName ?? null,
      requesterEmail,
      artisanEmail,
      requestedAt: now,
    })
    .returning({ id: attestationRequest.id })

  await sendAttestationRequest({
    to: artisanEmail,
    requesterName: input.requesterName ?? 'Un client',
    requesterEmail,
    pageUrl,
    signupUrl: `${base}/inscription?siret=${input.siret}`,
    optoutUrl,
    member: outcome !== 'stranger',
    qualification: await firstQualification(input.siret, now),
  })

  // La confirmation au demandeur ne doit jamais faire echouer la demande : le
  // mail a l'artisan, lui, est deja parti.
  try {
    await sendRequestConfirmation({
      to: requesterEmail,
      requesterName: input.requesterName ?? 'Bonjour',
      pageUrl,
    })
  } catch {
    // Panne SMTP en aval : la demande reste enregistree.
  }

  await recordEvent({
    type: 'lead.requested',
    subjectType: 'attestation_request',
    subjectId: row.id,
    actorType: 'customer',
  })

  return 'ok'
}

/**
 * Relance une demande a la main, par le chemin exact d'une demande publique.
 *
 * **La delegation a `createRequest` est la garantie, pas la commodite.** Elle
 * seule fait porter au geste d'un ecran interne les memes gardes qu'a un
 * inconnu : l'opposition, la treve de sept jours par artisan, le doublon de
 * couple, le plafond horaire. Un envoi reimplemente ici rendrait la treve
 * contournable par un humain de chez nous, ce qui revient a ne pas l'avoir —
 * et un artisan qui a demande a ne plus etre contacte le serait davantage
 * parce que la demande vient de nous.
 *
 * Une ligne sans SIRET ni contacts n'a rien a relancer : anonymisee a trente
 * jours, ou posee en canal `copied`, qui n'a jamais eu d'adresse d'artisan.
 * `already_requested` est alors le seul des cinq verdicts qui n'affirme rien
 * de faux — cette demande a bien eu lieu, et rien de neuf n'en partira. Les
 * trois autres refus inventeraient un fait sur un tiers : une opposition, une
 * treve en cours, un demandeur abusif.
 *
 * Un identifiant inconnu LEVE. Aucune ligne n'est jamais supprimee, seulement
 * videe : il ne vient donc pas d'une liste perimee mais d'une adresse forgee,
 * et le taire derriere un verdict le ferait passer pour un refus ordinaire.
 */
export async function relaunchRequest(id: string, now: Date): Promise<GuardVerdict> {
  const [row] = await db.select().from(attestationRequest).where(eq(attestationRequest.id, id))
  if (!row) throw new Error(`Demande introuvable : ${id}`)
  if (!row.siret || !row.artisanEmail || !row.requesterEmail) return 'already_requested'

  return createRequest(
    {
      siret: row.siret,
      channel: 'sent',
      notify: row.notify,
      requesterName: row.requesterName ?? undefined,
      requesterEmail: row.requesterEmail,
      artisanEmail: row.artisanEmail,
    },
    now,
  )
}

/**
 * Une qualification RGE en cours, en une ligne — l'accroche du mail artisan.
 *
 * `Qualification` expose `organisation` (et non `organisme`) et cette
 * organisation est nullable : sans elle, le libelle porte seul l'accroche.
 */
async function firstQualification(siret: string, now: Date): Promise<string | null> {
  try {
    const [first] = activeQualifications(await fetchRgeRows(siret), now)
    if (!first) return null
    return first.organisation ? `${first.organisation}, ${first.label}` : first.label
  } catch {
    // L'ADEME est indisponible : le mail part sans son accroche, plutot que
    // pas du tout.
    return null
  }
}
