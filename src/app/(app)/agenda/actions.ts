'use server'

import { revalidatePath } from 'next/cache'
import { currentCompany } from '@/lib/session'
import { cancelAppointment } from '@/services/appointments'

export interface CancelState {
  error?: string
}

/**
 * Annule un rendez-vous.
 *
 * Il n'est pas supprime : le client a ete prevenu que quelqu'un viendrait, et
 * effacer la ligne effacerait ce fait.
 */
export async function cancel(appointmentId: string, _state: CancelState): Promise<CancelState> {
  const { companyId } = await currentCompany()

  try {
    await cancelAppointment(companyId, appointmentId)
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath('/agenda')
  return {}
}
