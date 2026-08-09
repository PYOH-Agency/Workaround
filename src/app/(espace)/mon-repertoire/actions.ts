'use server'

import { revalidatePath } from 'next/cache'
import { currentRequester } from '@/lib/session'
import { addManualEntry } from '@/services/address-book'

export interface AddEntryState {
  error?: string
  added?: boolean
}

/**
 * Le demandeur ajoute une entreprise que nous ne connaissons pas.
 *
 * **Aucune invitation n'en part.** On n'a qu'un seul premier contact avec un
 * artisan, et il vaudra en P2, accompagne d'une demande reelle.
 */
export async function addEntry(
  _state: AddEntryState,
  form: FormData,
): Promise<AddEntryState> {
  const { requesterId } = await currentRequester()

  try {
    await addManualEntry({
      requesterId,
      freeName: String(form.get('nom') ?? ''),
      phone: String(form.get('telephone') ?? ''),
      activityCode: String(form.get('activite') ?? '') || null,
      note: String(form.get('note') ?? ''),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath('/mon-repertoire')
  return { added: true }
}
