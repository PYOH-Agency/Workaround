'use server'

import { revalidatePath } from 'next/cache'
import { currentRequester } from '@/lib/session'
import { declareReception } from '@/services/reception'

export interface ReceptionState {
  error?: string
  saved?: boolean
}

/**
 * Le maitre d'ouvrage declare la reception de ses travaux.
 *
 * La date est celle qu'il saisit, pas celle du clic : la reception a eu lieu
 * un jour precis, et c'est lui qui le sait.
 */
export async function declareReceptionAction(
  quoteId: string,
  _state: ReceptionState,
  form: FormData,
): Promise<ReceptionState> {
  const { requesterId } = await currentRequester()

  try {
    const declaredAt = new Date(String(form.get('date')))
    if (Number.isNaN(declaredAt.getTime())) return { error: 'Date invalide.' }

    await declareReception({ requesterId, quoteId, declaredAt, now: new Date() })
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/mes-chantiers/${quoteId}`)
  return { saved: true }
}
