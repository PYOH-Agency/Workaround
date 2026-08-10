'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/access'
import { createAmendment } from '@/services/amendments'
import { declareCompleted } from '@/services/completion'
import { openDispute } from '@/services/disputes'
import { saveStatement } from '@/services/statements'
import { bookAppointment, conflictingAppointments } from '@/services/appointments'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export interface AmendState {
  error?: string
}

/**
 * Cree un avenant et emmene l'artisan sur son brouillon.
 *
 * L'avenant nait avec les lignes de la version precedente : ce qui reste a
 * faire est d'ajouter ce qui a change, puis de le faire signer.
 */
export async function amendQuote(quoteId: string, _state: AmendState): Promise<AmendState> {
  const { companyId } = await requireCapability('quote.write')

  let created
  try {
    created = await createAmendment(companyId, quoteId)
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc try : `redirect` signale la navigation en levant une
  // exception, qu'un catch afficherait comme une erreur.
  redirect(`/devis/${created.id}/modifier`)
}

export interface CompleteState {
  error?: string
}

/**
 * L'artisan declare son chantier termine.
 *
 * La date est celle qu'il saisit, pas celle du clic : un chantier fini vendredi
 * et declare lundi ne doit pas lui couter deux jours ouvres.
 */
export async function completeChantier(
  quoteId: string,
  _state: CompleteState,
  form: FormData,
): Promise<CompleteState> {
  const { companyId } = await requireCapability('chantier.complete')

  try {
    const at = new Date(String(form.get('date')))
    if (Number.isNaN(at.getTime())) return { error: 'Date invalide.' }

    await declareCompleted(companyId, quoteId, at)
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/devis/${quoteId}`)
  return {}
}

export interface DisputeState {
  error?: string
}

/**
 * L'artisan conteste la mesure de son delai.
 *
 * Le chantier sort du calcul immediatement — article 18 — et y revient de
 * lui-meme au bout de quatorze jours si le client ne repond pas.
 */
export async function disputeLeadTime(
  quoteId: string,
  _state: DisputeState,
  form: FormData,
): Promise<DisputeState> {
  const { companyId } = await requireCapability('passport.manage')

  try {
    await openDispute(companyId, quoteId, String(form.get('reason') ?? ''), new Date())
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/devis/${quoteId}`)
  return {}
}

export interface StatementState {
  error?: string
  saved?: boolean
}

/** La declaration complementaire — article 16. Elle ne change aucun chiffre. */
export async function writeStatement(
  quoteId: string,
  _state: StatementState,
  form: FormData,
): Promise<StatementState> {
  const { companyId } = await requireCapability('passport.manage')

  try {
    await saveStatement(companyId, quoteId, String(form.get('body') ?? ''))
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/devis/${quoteId}`)
  return { saved: true }
}

export interface BookWorkState {
  error?: string
  /** Les rendez-vous que celui-ci chevauche. On avertit, on n'interdit pas. */
  conflicts?: { startsAt: string; endsAt: string; customerName: string }[]
  booked?: boolean
}

/**
 * Prend un rendez-vous d'intervention sur ce devis.
 *
 * Le chevauchement est **signale, jamais bloquant** : un artisan peut
 * legitimement poser deux rendez-vous qui se croisent — un compagnon prend
 * l'un, il passe en coup de vent sur l'autre. Bloquer le ferait mentir sur ses
 * horaires, ou repartir vers son telephone.
 */
export async function bookWork(
  quoteId: string,
  _state: BookWorkState,
  form: FormData,
): Promise<BookWorkState> {
  const { companyId } = await requireCapability('agenda.manage')

  try {
    const startsAt = new Date(String(form.get('debut')))
    const endsAt = new Date(String(form.get('fin')))
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return { error: 'Créneau invalide.' }
    }

    const [found] = await db
      .select({ projectId: quote.projectId })
      .from(quote)
      .where(and(eq(quote.id, quoteId), eq(quote.companyId, companyId)))
    if (!found) return { error: 'Devis introuvable.' }

    // Lus AVANT l'ecriture : apres, le rendez-vous se chevaucherait lui-meme.
    const crossing = await conflictingAppointments(companyId, { startsAt, endsAt })

    await bookAppointment({
      companyId,
      projectId: found.projectId,
      kind: 'work',
      startsAt,
      endsAt,
      note: String(form.get('note') ?? ''),
    })

    revalidatePath(`/devis/${quoteId}`)

    return {
      booked: true,
      conflicts: crossing.map((item) => ({
        startsAt: item.startsAt.toISOString(),
        endsAt: item.endsAt.toISOString(),
        customerName: item.customerName,
      })),
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
