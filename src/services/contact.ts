import { and, eq, gte } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, contactThrottle } from '@/db/schema'
import { exceedsLimit } from '@/domain/throttle'
import { recordEvent } from '@/services/events'
import { sendRawMail } from '@/services/email'

export interface ContactRequest {
  companyId: string
  name: string
  email: string
  phone: string
  message: string
  /** Empreinte de l'adresse d'origine. Jamais l'adresse elle-meme. */
  ipHash: string
}

/**
 * Relaie une demande a une entreprise choisie, puis l'oublie.
 *
 * **Rien de ce que le demandeur saisit n'est ecrit.** Ce n'est pas une economie
 * de table : il n'existe alors aucune base de leads a revendre, et l'interdit
 * du modele economique cesse d'etre une promesse pour devenir une
 * impossibilite. Y revenir supposerait de creer la table — un acte visible.
 *
 * Le journal ne recoit que le FAIT, ce qui suffit a l'attribution et respecte
 * la regle posee en M1 : aucune donnee personnelle dans une table immuable.
 */
export async function relayContact(request: ContactRequest, now: Date): Promise<void> {
  const target = await db.query.company.findFirst({ where: eq(company.id, request.companyId) })
  if (!target) throw new Error('Entreprise introuvable')

  if (!target.email?.trim()) {
    throw new Error('Cette entreprise n’a pas d’adresse : impossible de la joindre par écrit')
  }

  const recent = await db
    .select({ createdAt: contactThrottle.createdAt })
    .from(contactThrottle)
    .where(
      and(
        eq(contactThrottle.ipHash, request.ipHash),
        gte(contactThrottle.createdAt, new Date(now.getTime() - 3_600_000)),
      ),
    )

  if (
    exceedsLimit(
      recent.map((r) => r.createdAt),
      now,
    )
  ) {
    throw new Error('Vous avez envoyé trop de demandes récemment. Réessayez dans une heure.')
  }

  await sendRawMail({
    to: target.email,
    subject: `Demande reçue via D’équerre — ${request.name}`,
    text: [
      `${request.name} vous a trouvé sur D’équerre et souhaite vous contacter.`,
      '',
      request.message,
      '',
      `Répondre directement : ${request.email}${request.phone ? ` · ${request.phone}` : ''}`,
      '',
      'Nous ne conservons aucune trace de ce message : répondez à cette adresse.',
    ].join('\n'),
  })

  await db.insert(contactThrottle).values({ ipHash: request.ipHash })

  // Le fait, et rien d'autre : ni nom, ni adresse, ni message.
  await recordEvent({
    type: 'directory.contact',
    subjectType: 'company',
    subjectId: request.companyId,
    companyId: request.companyId,
    actorType: 'customer',
  })
}
