'use server'

import { revalidatePath } from 'next/cache'
import { currentStaff } from '@/lib/staff-session'
import { switchPlan } from '@/services/plan'
import type { Plan } from '@/domain/authorization'

/**
 * La bascule, declenchee par un humain de chez nous.
 *
 * Le plan cible est passe EXPLICITEMENT, jamais deduit de l'etat courant : un
 * bouton « inverser » sur une page rechargee deux fois basculerait deux fois.
 */
export async function setPlan(companyId: string, plan: Plan): Promise<void> {
  const { userId } = await currentStaff()

  await switchPlan({ companyId, plan, by: userId })
  revalidatePath('/entreprises')
}
