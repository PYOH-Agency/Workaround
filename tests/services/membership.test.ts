import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { member, memberInvitation } from '@/db/schema'
import { claimInvitation, invitationAwaits } from '@/services/membership'
import { inviteMember, revokeInvitation } from '@/services/team'
import { switchPlan } from '@/services/plan'
import { createCompany } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

async function proCompany(): Promise<string> {
  const companyId = await createCompany()
  await switchPlan({ companyId, plan: 'pro', by: randomUUID() })
  return companyId
}

describe('reclamer son invitation', () => {
  it('rattache le compte a l entreprise, avec le role invite', async () => {
    const companyId = await proCompany()
    const email = `compagnon-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    const userId = randomUUID()
    const joined = await claimInvitation(userId, email.toUpperCase())

    expect(joined).not.toBeNull()
    expect(joined!.companyId).toBe(companyId)
    expect(joined!.role).toBe('member')
  })

  it('ne rend RIEN sans invitation', async () => {
    expect(await claimInvitation(randomUUID(), `inconnu-${randomUUID()}@test.local`)).toBeNull()
  })

  it('ne rend RIEN pour une invitation revoquee', async () => {
    // Le patron a le dernier mot, y compris apres l'envoi du message.
    const companyId = await proCompany()
    const email = `annule-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    const [pending] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, companyId))
    await revokeInvitation(companyId, pending.id)

    expect(await claimInvitation(randomUUID(), email)).toBeNull()
  })

  it('ne rattache PAS un compte deja membre d une autre entreprise', async () => {
    // `member.user_id` est unique : le rattacher ailleurs lui ferait perdre son
    // entreprise actuelle sans que personne ne l'ait demande.
    const home = await proCompany()
    const userId = randomUUID()
    const email = `deja-${randomUUID().slice(0, 8)}@test.local`
    await db.insert(member).values({ companyId: home, userId, email, role: 'owner' })

    const elsewhere = await proCompany()
    await inviteMember({ companyId: elsewhere, email, role: 'member', by: randomUUID() })

    expect(await claimInvitation(userId, email)).toBeNull()

    const [row] = await db.select().from(member).where(eq(member.userId, userId))
    expect(row.companyId).toBe(home)
  })

  it('ne consomme l invitation qu UNE fois', async () => {
    const companyId = await proCompany()
    const email = `unique-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    const userId = randomUUID()
    await claimInvitation(userId, email)
    await claimInvitation(userId, email)

    expect(
      await db.$count(member, and(eq(member.companyId, companyId), eq(member.userId, userId))),
    ).toBe(1)
  })
})

describe('une invitation attend-elle cette adresse', () => {
  it('vrai pour une invitation en attente', async () => {
    // Le compagnon que son patron vient d'inviter n'a jamais eu de compte, et
    // `/connexion` ne cree plus rien : sans cette lecture, il n'a AUCUN chemin
    // d'entree.
    const companyId = await proCompany()
    const email = `attendu-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    // En majuscules : la porte recopie ce que la personne a tape.
    expect(await invitationAwaits(email.toUpperCase())).toBe(true)
  })

  it('faux pour une invitation deja acceptee', async () => {
    const companyId = await proCompany()
    const email = `entre-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })
    await claimInvitation(randomUUID(), email)

    expect(await invitationAwaits(email)).toBe(false)
  })

  it('faux pour une invitation revoquee', async () => {
    // Le patron a le dernier mot : sa revocation ne doit pas laisser derriere
    // elle une autorisation de creer un compte.
    const companyId = await proCompany()
    const email = `annulee-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    const [pending] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, companyId))
    await revokeInvitation(companyId, pending.id)

    expect(await invitationAwaits(email)).toBe(false)
  })

  it('faux pour une adresse inconnue', async () => {
    expect(await invitationAwaits(`inconnu-${randomUUID()}@test.local`)).toBe(false)
  })
})
