import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { AccessError, type Plan } from '@/domain/authorization'
import { recordEvent } from '@/services/events'

export async function planOf(companyId: string): Promise<Plan> {
  const [row] = await db
    .select({ plan: company.plan })
    .from(company)
    .where(eq(company.id, companyId))

  if (!row) throw new Error('Entreprise introuvable')
  return row.plan
}

/**
 * La garde de plan **au niveau du service**.
 *
 * Doublon apparent avec `requireCapability`, qui n'en est pas un : celle-ci ne
 * connait aucune session, et c'est exactement pourquoi elle existe. Un cron,
 * une reprise de donnees ou une action ecrite dans six mois passeraient a cote
 * du bord serveur ; ils ne passent pas a cote d'ici.
 */
export async function assertProPlan(companyId: string): Promise<void> {
  if ((await planOf(companyId)) !== 'pro') {
    throw new AccessError('plan', 'Cette fonction fait partie de l’offre Pro.')
  }
}

/**
 * Bascule l'abonnement, a la main, depuis le backoffice.
 *
 * Le changement s'inscrit au journal : savoir DEPUIS QUAND une entreprise est
 * Pro sera la premiere question posee le jour d'un litige de facturation.
 * Une bascule sans changement n'inscrit rien — un journal qui enregistre des
 * non-evenements cesse d'etre lisible.
 */
export async function switchPlan(input: {
  companyId: string
  plan: Plan
  by: string
}): Promise<void> {
  const from = await planOf(input.companyId)
  if (from === input.plan) return

  await db.update(company).set({ plan: input.plan }).where(eq(company.id, input.companyId))

  await recordEvent({
    type: 'company.plan_changed',
    subjectType: 'company',
    subjectId: input.companyId,
    companyId: input.companyId,
    actorType: 'staff',
    actorId: input.by,
    payload: { from, to: input.plan },
  })
}
