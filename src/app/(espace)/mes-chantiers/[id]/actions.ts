'use server'

import { revalidatePath } from 'next/cache'
import { currentRequester } from '@/lib/session'
import { declareReception, liftReserves } from '@/services/reception'

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

    // La case « avec reserves » decouvre le champ ; sans elle, la reception est
    // sans reserve, quoi qu'il reste dans le champ cache.
    const withReserves = form.get('avec_reserves') === 'on'
    const reserves = withReserves ? String(form.get('reserves') ?? '') : null
    if (withReserves && !reserves?.trim()) return { error: 'Décrivez les réserves.' }

    await declareReception({ requesterId, quoteId, declaredAt, reserves, now: new Date() })
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/mes-chantiers/${quoteId}`)
  return { saved: true }
}

/**
 * Le maitre d'ouvrage declare la levee des reserves.
 *
 * La date est celle des reprises constatees, pas celle du clic : c'est elle qui
 * debloque la retenue, et lui seul la connait.
 */
export async function liftReservesAction(
  quoteId: string,
  _state: ReceptionState,
  form: FormData,
): Promise<ReceptionState> {
  const { requesterId } = await currentRequester()

  try {
    const liftedAt = new Date(String(form.get('date')))
    if (Number.isNaN(liftedAt.getTime())) return { error: 'Date invalide.' }

    await liftReserves({ requesterId, quoteId, liftedAt, now: new Date() })
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/mes-chantiers/${quoteId}`)
  return { saved: true }
}
