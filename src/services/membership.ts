import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { member, memberInvitation } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'
import { recordEvent } from '@/services/events'

/**
 * Rattache un compte a l'entreprise qui l'a invite.
 *
 * Meme discipline que `claimRequester` : la bascule de l'invitation est un
 * PREDICAT SQL, pas un test JavaScript. Ecrite en JavaScript, elle laisserait
 * deux connexions simultanees creer deux appartenances.
 *
 * **Un compte deja rattache a une entreprise ACTIVE ne rejoint pas la
 * seconde** : `member.user_id` est unique, et il n'existe aujourd'hui aucune
 * notion d'appartenance multiple. L'invitation reste alors en attente, visible
 * de celui qui l'a emise — un blocage qui se voit vaut mieux qu'un
 * rattachement silencieux au mauvais employeur.
 *
 * Un membre RETIRE, lui, peut etre reinvite : sa ligne est ressuscitee plutot
 * que dupliquee, ce qui preserve la continuite de sa trace au journal.
 *
 * Vit a part de `services/team.ts` : celui-la porte les gestes du patron,
 * celui-ci le geste de l'invite. La session importe le second, jamais le
 * premier.
 */
export async function claimInvitation(userId: string, rawEmail: string) {
  const email = normalizeEmail(rawEmail)

  const active = await db.query.member.findFirst({
    where: and(eq(member.userId, userId), isNull(member.removedAt)),
  })
  if (active) return null

  // Une seule invitation a la fois : `UPDATE` ne sait pas se limiter a une
  // ligne, et deux entreprises peuvent avoir invite la meme adresse.
  const pending = await db.query.memberInvitation.findFirst({
    where: and(
      eq(memberInvitation.email, email),
      isNull(memberInvitation.acceptedAt),
      isNull(memberInvitation.revokedAt),
    ),
  })
  if (!pending) return null

  const [accepted] = await db
    .update(memberInvitation)
    .set({ acceptedAt: new Date() })
    .where(
      and(
        eq(memberInvitation.id, pending.id),
        isNull(memberInvitation.acceptedAt),
        isNull(memberInvitation.revokedAt),
      ),
    )
    .returning()

  // Revoquee entre la lecture et l'ecriture : le patron a change d'avis, et il
  // a le dernier mot.
  if (!accepted) return null

  const [joined] = await db
    .insert(member)
    .values({ companyId: accepted.companyId, userId, email, role: accepted.role })
    .onConflictDoUpdate({
      target: member.userId,
      set: { companyId: accepted.companyId, email, role: accepted.role, removedAt: null },
    })
    .returning()

  await recordEvent({
    type: 'member.joined',
    subjectType: 'member',
    subjectId: joined.id,
    companyId: joined.companyId,
    actorType: 'company',
    actorId: userId,
    payload: { role: joined.role },
  })

  return joined
}
