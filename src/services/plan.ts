import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, event } from '@/db/schema'
import { AccessError, type Plan } from '@/domain/authorization'
import { recordEvent } from '@/services/events'
import { sendProRequest } from '@/services/pro-mail'

const PLAN_REQUESTED = 'company.pro_requested'
const PLAN_CHANGED = 'company.plan_changed'

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
    type: PLAN_CHANGED,
    subjectType: 'company',
    subjectId: input.companyId,
    companyId: input.companyId,
    actorType: 'staff',
    actorId: input.by,
    payload: { from, to: input.plan },
  })
}

/**
 * Une demande d'activation Pro est-elle en attente ?
 *
 * « En attente » = une demande plus recente que le dernier changement de plan.
 * Ainsi une entreprise repassee en gratuit apres coup peut redemander, et une
 * demande d'il y a un an, suivie d'une activation puis d'un retour au gratuit,
 * ne bloque pas l'ecran sur un « deja demande » perime. On lit le journal, seule
 * source de verite, plutot qu'un drapeau sur l'entreprise qui pourrait diverger.
 */
export async function hasPendingProRequest(companyId: string): Promise<boolean> {
  // Le plus recent des deux faits qui se repondent — demander, (dés)activer.
  const [last] = await db
    .select({ type: event.type })
    .from(event)
    .where(
      and(
        eq(event.subjectId, companyId),
        inArray(event.type, [PLAN_REQUESTED, PLAN_CHANGED]),
      ),
    )
    .orderBy(desc(event.occurredAt))
    .limit(1)

  return last?.type === PLAN_REQUESTED
}

/**
 * L'artisan demande l'activation de l'offre Pro, depuis l'application.
 *
 * Deux effets, et pas un paiement : un fait au journal — savoir qu'une demande
 * existe, et depuis quand — et un courriel au backoffice, qui bascule le plan a
 * la main. On ne promet donc jamais un acces immediat : l'ecran dit que la
 * demande est partie, pas que l'offre est ouverte.
 *
 * Idempotent : une demande deja en attente n'en renvoie pas une seconde. Un
 * artisan qui reclique ne noie pas le backoffice sous les doublons.
 */
export async function requestProActivation(input: {
  companyId: string
  legalName: string
  siret: string
  by: string
}): Promise<void> {
  if ((await planOf(input.companyId)) === 'pro') return
  if (await hasPendingProRequest(input.companyId)) return

  await recordEvent({
    type: PLAN_REQUESTED,
    subjectType: 'company',
    subjectId: input.companyId,
    companyId: input.companyId,
    actorType: 'company',
    actorId: input.by,
    payload: {},
  })

  await sendProRequest({ legalName: input.legalName, siret: input.siret })
}
