import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { member, memberInvitation } from '@/db/schema'
import { inviteMember, removeMember, revokeInvitation, teamOf } from '@/services/team'
import { switchPlan } from '@/services/plan'
import { createCompany } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

/** Une adresse unique : les tests tournent en parallele sur la meme base. */
const someEmail = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}@test.local`

/**
 * Une entreprise Pro, avec son responsable deja en place.
 *
 * **Un identifiant Supabase NEUF a chaque appel.** `member.user_id` est unique :
 * une constante partagee n'aurait dote que la premiere entreprise du fichier
 * d'un responsable, et les tests suivants auraient porte sur une equipe vide
 * sans que rien ne le signale.
 */
async function proCompany() {
  const companyId = await createCompany()
  await switchPlan({ companyId, plan: 'pro', by: randomUUID() })

  const owner = { id: randomUUID(), email: someEmail('patron') }
  await db.insert(member).values({ companyId, userId: owner.id, email: owner.email, role: 'owner' })

  return { companyId, owner }
}

/** Un membre de plus dans une entreprise. Rend sa ligne. */
async function hire(companyId: string, role: 'owner' | 'member') {
  const [row] = await db
    .insert(member)
    .values({ companyId, userId: randomUUID(), email: someEmail(role), role })
    .returning()
  return row
}

describe('inviter', () => {
  it('REFUSE une entreprise gratuite, au niveau du service', async () => {
    // La garde ne peut pas vivre dans l'ecran : un appel ecrit dans six mois
    // n'y passerait pas.
    const companyId = await createCompany()

    await expect(
      inviteMember({ companyId, email: someEmail('compagnon'), role: 'member', by: randomUUID() }),
    ).rejects.toThrow(/Pro/)
  })

  it('normalise l adresse', async () => {
    const { companyId, owner } = await proCompany()

    await inviteMember({
      companyId,
      email: '  Compagnon@Test.LOCAL ',
      role: 'member',
      by: owner.id,
    })

    const [row] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, companyId))

    expect(row.email).toBe('compagnon@test.local')
  })

  it('n en cree pas deux pour la meme personne', async () => {
    const { companyId, owner } = await proCompany()
    const invite = {
      companyId,
      email: someEmail('compagnon'),
      role: 'member' as const,
      by: owner.id,
    }

    await inviteMember(invite)
    await inviteMember(invite)

    expect(await db.$count(memberInvitation, eq(memberInvitation.companyId, companyId))).toBe(1)
  })

  it('refuse d inviter quelqu un qui est deja de l equipe', async () => {
    const { companyId, owner } = await proCompany()

    await expect(
      inviteMember({ companyId, email: owner.email, role: 'member', by: owner.id }),
    ).rejects.toThrow(/déjà/)
  })
})

describe('revoquer', () => {
  it('sort l invitation de l attente sans effacer la ligne', async () => {
    const { companyId, owner } = await proCompany()
    await inviteMember({ companyId, email: someEmail('compagnon'), role: 'member', by: owner.id })

    const [pending] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, companyId))

    await revokeInvitation(companyId, pending.id)

    expect((await teamOf(companyId)).invitations).toEqual([])

    const [row] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.id, pending.id))
    expect(row.revokedAt).not.toBeNull()
  })

  it('ne revoque RIEN chez une autre entreprise', async () => {
    // Le perimetre par entreprise est porte par la REQUETE, comme partout.
    const mine = await proCompany()
    const rival = await proCompany()
    await inviteMember({
      companyId: rival.companyId,
      email: someEmail('cible'),
      role: 'member',
      by: rival.owner.id,
    })

    const [theirs] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, rival.companyId))

    await expect(revokeInvitation(mine.companyId, theirs.id)).rejects.toThrow(/introuvable/)

    const [row] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.id, theirs.id))
    expect(row.revokedAt).toBeNull()
  })
})

describe('l equipe', () => {
  it('rend les membres actifs et les invitations en attente', async () => {
    const { companyId, owner } = await proCompany()
    const invited = someEmail('compagnon')
    await inviteMember({ companyId, email: invited, role: 'member', by: owner.id })

    const team = await teamOf(companyId)

    expect(team.members).toHaveLength(1)
    expect(team.members[0].role).toBe('owner')
    expect(team.invitations).toHaveLength(1)
    expect(team.invitations[0].email).toBe(invited)
  })

  it('ne voit PAS l equipe d une autre entreprise', async () => {
    const mine = await proCompany()
    const rival = await proCompany()
    await inviteMember({
      companyId: rival.companyId,
      email: someEmail('cible'),
      role: 'member',
      by: rival.owner.id,
    })

    const team = await teamOf(mine.companyId)

    expect(team.invitations).toEqual([])
    expect(team.members).toHaveLength(1)
    expect(team.members[0].email).toBe(mine.owner.email)
  })
})

describe('retirer un membre', () => {
  it('lui retire l acces sans supprimer la ligne', async () => {
    const { companyId, owner } = await proCompany()
    const compagnon = await hire(companyId, 'member')

    await removeMember(companyId, compagnon.id, owner.id)

    const team = await teamOf(companyId)
    expect(team.members.map((row) => row.id)).not.toContain(compagnon.id)

    const [row] = await db.select().from(member).where(eq(member.id, compagnon.id))
    expect(row).toBeDefined()
    expect(row.removedAt).not.toBeNull()
  })

  it('REFUSE de retirer le dernier responsable', async () => {
    // Une entreprise sans responsable est irrecuperable : il faudrait nous
    // appeler pour y rentrer.
    const { companyId, owner } = await proCompany()
    const team = await teamOf(companyId)

    await expect(removeMember(companyId, team.members[0].id, owner.id)).rejects.toThrow(
      /au moins un responsable/,
    )
  })

  it('accepte de retirer UN responsable quand il en reste un autre', async () => {
    const { companyId, owner } = await proCompany()
    const second = await hire(companyId, 'owner')

    await expect(removeMember(companyId, second.id, owner.id)).resolves.toBeUndefined()
  })

  it('ne retire RIEN chez une autre entreprise', async () => {
    const mine = await proCompany()
    const rival = await proCompany()
    const theirs = await hire(rival.companyId, 'member')

    await expect(removeMember(mine.companyId, theirs.id, mine.owner.id)).rejects.toThrow(
      /introuvable/,
    )

    const [row] = await db.select().from(member).where(eq(member.id, theirs.id))
    expect(row.removedAt).toBeNull()
  })
})
