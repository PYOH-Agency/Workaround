'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { currentCompany } from '@/lib/session'
import { createAmendment } from '@/services/amendments'
import { declareCompleted } from '@/services/completion'

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
  const { companyId } = await currentCompany()

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
  const { companyId } = await currentCompany()

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
