import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, event, member, memberInvitation } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'
import type { Role } from '@/domain/authorization'
import { assertProPlan } from '@/services/plan'
import { recordEvent } from '@/services/events'
import { sendInvitation } from '@/services/team-mail'

/**
 * Les gestes du PATRON sur son equipe.
 *
 * Le geste de l'invite — reclamer son invitation — vit a part, dans
 * `services/membership.ts` : la session importe celui-la, jamais celui-ci.
 *
 * `normalizeEmail` vient de `@/domain/requester` : l'adresse s'y normalise
 * deja, et en ecrire une seconde version ferait diverger les deux le jour ou
 * l'une apprendra a gerer un cas de plus.
 */

export interface Team {
  /**
   * `userId` sert a l'ecran a reconnaitre la personne connectee, pour ne pas
   * lui proposer de se retirer elle-meme.
   */
  members: { id: string; userId: string; email: string; name: string | null; role: Role }[]
  invitations: { id: string; email: string; role: Role; invitedAt: Date }[]
}

/** L'equipe d'une entreprise : ses membres actifs, ses invitations en attente. */
export async function teamOf(companyId: string): Promise<Team> {
  const [members, invitations] = await Promise.all([
    db
      .select({
        id: member.id,
        userId: member.userId,
        email: member.email,
        name: member.name,
        role: member.role,
      })
      .from(member)
      .where(and(eq(member.companyId, companyId), isNull(member.removedAt)))
      .orderBy(asc(member.createdAt)),
    db
      .select({
        id: memberInvitation.id,
        email: memberInvitation.email,
        role: memberInvitation.role,
        invitedAt: memberInvitation.invitedAt,
      })
      .from(memberInvitation)
      .where(
        and(
          eq(memberInvitation.companyId, companyId),
          isNull(memberInvitation.acceptedAt),
          isNull(memberInvitation.revokedAt),
        ),
      )
      .orderBy(asc(memberInvitation.invitedAt)),
  ])

  return { members, invitations }
}

/**
 * Invite quelqu'un a rejoindre l'entreprise.
 *
 * La garde de plan est ICI, dans le service — pas seulement au bord serveur.
 * Reinviter une personne deja invitee ne cree pas de seconde ligne : le
 * message repart, ce qui est exactement ce que le patron voulait en recliquant.
 */
export async function inviteMember(input: {
  companyId: string
  email: string
  role: Role
  by: string
}): Promise<void> {
  await assertProPlan(input.companyId)

  const email = normalizeEmail(input.email)
  if (!email.includes('@')) throw new Error('Cette adresse n’est pas valide.')

  const already = await db.query.member.findFirst({
    where: and(
      eq(member.companyId, input.companyId),
      eq(member.email, email),
      isNull(member.removedAt),
    ),
  })
  if (already) throw new Error('Cette personne fait déjà partie de votre équipe.')

  const [entreprise] = await db
    .select({ legalName: company.legalName })
    .from(company)
    .where(eq(company.id, input.companyId))

  const pending = await db.query.memberInvitation.findFirst({
    where: and(
      eq(memberInvitation.companyId, input.companyId),
      eq(memberInvitation.email, email),
      isNull(memberInvitation.acceptedAt),
      isNull(memberInvitation.revokedAt),
    ),
  })

  if (!pending) {
    const [created] = await db
      .insert(memberInvitation)
      .values({ companyId: input.companyId, email, role: input.role, invitedBy: input.by })
      .returning()

    await recordEvent({
      type: 'member.invited',
      subjectType: 'member_invitation',
      subjectId: created.id,
      companyId: input.companyId,
      actorType: 'company',
      actorId: input.by,
      // **Aucune adresse dans le journal.** La lecon de M1 : une donnee
      // personnelle inscrite dans un registre immuable rend le droit a
      // l'effacement structurellement impossible.
      payload: { role: input.role },
    })
  }

  await sendInvitation({
    to: email,
    companyName: entreprise.legalName,
    link: `${process.env.NEXT_PUBLIC_APP_URL}/connexion`,
  })
}

/**
 * Revoque une invitation en attente.
 *
 * Le perimetre par entreprise est porte par la REQUETE. Ecrit comme une
 * verification apres lecture, il laisserait revoquer l'invitation d'une autre
 * entreprise en devinant un identifiant.
 */
export async function revokeInvitation(companyId: string, invitationId: string): Promise<void> {
  const [revoked] = await db
    .update(memberInvitation)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(memberInvitation.id, invitationId),
        eq(memberInvitation.companyId, companyId),
        isNull(memberInvitation.acceptedAt),
        isNull(memberInvitation.revokedAt),
      ),
    )
    .returning()

  if (!revoked) throw new Error('Invitation introuvable.')
}

/**
 * Retire un membre de l'equipe.
 *
 * **On retire, on n'efface pas** : `removed_at` plutot qu'un `DELETE`. Le
 * journal garde son identifiant Supabase dans `actor_id` sur tout ce qu'il a
 * fait, et supprimer la ligne rendrait ces faits illisibles. Ses publications
 * au fil de chantier restent, elles aussi — effacer sa trace reecrirait un
 * chantier.
 *
 * **Le dernier responsable ne se retire pas.** Le comptage et l'ecriture
 * tiennent dans une transaction avec verrouillage des lignes concernees : sans
 * elle, deux retraits simultanes verraient chacun deux responsables et
 * laisseraient l'entreprise sans aucun.
 *
 * L'evenement est ecrit avec `tx`, non avec `recordEvent` qui ecrit sur `db` :
 * un retrait annule aurait sinon laisse au journal la trace d'un retrait qui
 * n'a pas eu lieu — le defaut corrige en M3 sur le preavis.
 */
export async function removeMember(
  companyId: string,
  memberId: string,
  by: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: member.id, role: member.role })
      .from(member)
      .where(and(eq(member.companyId, companyId), isNull(member.removedAt)))
      .for('update')

    const target = active.find((row) => row.id === memberId)
    if (!target) throw new Error('Ce membre est introuvable dans votre équipe.')

    const owners = active.filter((row) => row.role === 'owner').length
    if (target.role === 'owner' && owners <= 1) {
      throw new Error('Une entreprise garde au moins un responsable.')
    }

    await tx.update(member).set({ removedAt: new Date() }).where(eq(member.id, memberId))

    await tx.insert(event).values({
      type: 'member.removed',
      subjectType: 'member',
      subjectId: memberId,
      companyId,
      actorType: 'company',
      actorId: by,
      payload: { role: target.role },
    })
  })
}
