import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { connection } from '@/db/client'
import { claimRequester, requesterFromSignature } from '@/services/requesters'

afterAll(async () => {
  await connection.end()
})

const someEmail = () => `paul-${randomUUID().slice(0, 8)}@test.local`

describe('le compte cree par la signature', () => {
  it('cree une ligne sans compte Supabase', async () => {
    const created = await requesterFromSignature({ email: someEmail(), name: 'Paul Martin' })

    expect(created.userId).toBeNull()
    expect(created.source).toBe('signature')
  })

  it('normalise l adresse', async () => {
    const raw = someEmail()
    const created = await requesterFromSignature({ email: `  ${raw.toUpperCase()} `, name: 'Paul' })

    expect(created.email).toBe(raw)
  })

  it('ne cree PAS un second compte a la deuxieme signature', async () => {
    // C'est tout l'interet : deux entreprises chez la meme personne doivent
    // aboutir au meme dossier.
    const email = someEmail()
    const first = await requesterFromSignature({ email, name: 'Paul Martin' })
    const second = await requesterFromSignature({ email: email.toUpperCase(), name: 'P. Martin' })

    expect(second.id).toBe(first.id)
    // Le nom le plus recent : c'est celui qu'elle vient d'ecrire.
    expect(second.name).toBe('P. Martin')
  })
})

describe('la revendication a la connexion', () => {
  it('rattache le compte Supabase a la ligne existante', async () => {
    const email = someEmail()
    await requesterFromSignature({ email, name: 'Paul' })
    const userId = randomUUID()

    expect((await claimRequester(userId, email))?.userId).toBe(userId)
  })

  it('ne revendique JAMAIS une ligne deja rattachee', async () => {
    // Sinon une adresse recyclee donnerait a un nouveau compte l'acces au
    // dossier d'un autre.
    const email = someEmail()
    await requesterFromSignature({ email, name: 'Paul' })
    const first = randomUUID()
    await claimRequester(first, email)

    expect((await claimRequester(randomUUID(), email))?.userId).toBe(first)
  })

  it('est idempotente pour le meme compte', async () => {
    // La revendication a lieu a chaque lecture de session : la rejouer ne doit
    // ni echouer, ni rendre null.
    const email = someEmail()
    await requesterFromSignature({ email, name: 'Paul' })
    const userId = randomUUID()

    await claimRequester(userId, email)
    expect((await claimRequester(userId, email))?.userId).toBe(userId)
  })

  it('rend null pour une adresse inconnue', async () => {
    expect(await claimRequester(randomUUID(), someEmail())).toBeNull()
  })
})
