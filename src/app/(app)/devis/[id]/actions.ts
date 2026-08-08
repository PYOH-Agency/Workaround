'use server'

import { redirect } from 'next/navigation'
import { currentCompany } from '@/lib/session'
import { createAmendment } from '@/services/amendments'

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
