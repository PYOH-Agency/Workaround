'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/access'
import { inviteMember, removeMember, revokeInvitation } from '@/services/team'
import type { Role } from '@/domain/authorization'

export interface TeamState {
  error?: string
  /** Compteur de reussites : sert de cle de remontage au formulaire, qui se vide. */
  saved?: number
}

export async function invite(state: TeamState, form: FormData): Promise<TeamState> {
  const { companyId, userId } = await requireCapability('team.manage')

  try {
    await inviteMember({
      companyId,
      email: String(form.get('email') ?? ''),
      role: form.get('role') === 'owner' ? 'owner' : ('member' as Role),
      by: userId,
    })
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/equipe')
  return { saved: (state.saved ?? 0) + 1 }
}

export async function revoke(invitationId: string, state: TeamState): Promise<TeamState> {
  const { companyId } = await requireCapability('team.manage')

  try {
    await revokeInvitation(companyId, invitationId)
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/equipe')
  return { saved: (state.saved ?? 0) + 1 }
}

export async function remove(memberId: string, state: TeamState): Promise<TeamState> {
  const { companyId, userId } = await requireCapability('team.manage')

  try {
    await removeMember(companyId, memberId, userId)
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/equipe')
  return { saved: (state.saved ?? 0) + 1 }
}
