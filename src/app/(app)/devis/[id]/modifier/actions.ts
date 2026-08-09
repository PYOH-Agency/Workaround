'use server'

import { redirect } from 'next/navigation'
import { currentCompany } from '@/lib/session'
import { updateDraftQuote } from '@/services/quote-edit'
import type { QuoteFormState } from '../../actions'
import { readLines } from '../../form-lines'

export async function editQuote(
  quoteId: string,
  _state: QuoteFormState,
  form: FormData,
): Promise<QuoteFormState> {
  const { companyId } = await currentCompany()

  try {
    const delay = String(form.get('delai') ?? '').trim()

    await updateDraftQuote(companyId, quoteId, {
      lines: readLines(form),
      committedLeadTimeDays: delay ? Number(delay) : null,
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc try : `redirect` signale la navigation en levant une
  // exception, qu'un catch afficherait comme une erreur.
  redirect(`/devis/${quoteId}`)
}
