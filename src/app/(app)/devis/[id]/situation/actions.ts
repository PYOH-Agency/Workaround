'use server'

import { redirect } from 'next/navigation'
import { requireCapability } from '@/lib/access'
import { issueSituation, type DeclaredProgress } from '@/services/situations'

export interface SituationState {
  error?: string
}

/**
 * Les pourcentages arrivent en champs `avancement-<id>` : un champ par ligne du
 * devis, nomme par l'identifiant de la ligne. Un tableau indexe se
 * desynchroniserait de l'ordre des lignes au premier avenant.
 */
export async function submitSituation(
  quoteId: string,
  _state: SituationState,
  form: FormData,
): Promise<SituationState> {
  const { companyId } = await requireCapability('situation.issue')

  const progress: DeclaredProgress[] = []
  for (const [name, value] of form.entries()) {
    if (!name.startsWith('avancement-')) continue
    progress.push({ quoteLineId: name.slice('avancement-'.length), percent: Number(value) })
  }

  let created
  try {
    created = await issueSituation({ companyId, quoteId, progress })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc try : `redirect` signale la navigation en levant une
  // exception, qu'un catch afficherait comme une erreur.
  redirect(`/factures/${created.id}`)
}
