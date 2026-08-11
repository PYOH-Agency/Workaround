import { describe, it, expect, afterAll, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { member } from '@/db/schema'
import { createCompany } from './invoice-fixtures'

const establishment = {
  siret: '',
  legalName: 'PLOMBERIE DU TEST',
  legalForm: '5499',
  legalFormLabel: 'SARL',
  vatNumber: 'FR00000000000',
  foundedOn: null,
  active: true,
  addressLine1: '1 rue du Test',
  postalCode: '44000',
  city: 'Nantes',
  rge: false,
}

vi.mock('@/services/company-lookup', () => ({
  findEstablishment: vi.fn(async (siret: string) => ({ ...establishment, siret })),
}))

const { createCompanyFor, RegistrationError } = await import('@/services/registration')
const { findEstablishment } = await import('@/services/company-lookup')

afterAll(async () => {
  await connection.end()
})

const someSiret = () => randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14)

describe('la creation d entreprise', () => {
  it('cree l entreprise et son proprietaire', async () => {
    const siret = someSiret()
    const userId = randomUUID()

    const company = await createCompanyFor(userId, 'paul@test.local', siret)

    expect(company.siret).toBe(siret)
    expect(company.legalName).toBe('PLOMBERIE DU TEST')
    // Prerempli par l'API : autant de mentions obligatoires que l'artisan
    // n'aura pas a saisir, donc pas a saisir de travers.
    expect(company.legalFormLabel).toBe('SARL')
  })

  it('refuse un etablissement cesse', async () => {
    vi.mocked(findEstablishment).mockResolvedValueOnce({ ...establishment, siret: someSiret(), active: false })

    await expect(createCompanyFor(randomUUID(), 'paul@test.local', someSiret())).rejects.toThrow(
      RegistrationError,
    )
  })

  it('refuse une entreprise deja inscrite', async () => {
    const siret = someSiret()
    await createCompanyFor(randomUUID(), 'premier@test.local', siret)

    await expect(createCompanyFor(randomUUID(), 'second@test.local', siret)).rejects.toThrow(
      'déjà inscrite',
    )
  })

  it('rend l entreprise existante si le compte en a deja une', async () => {
    // Deux clics sur le meme courriel : le second ne doit pas echouer, ni
    // creer une seconde entreprise.
    const userId = randomUUID()
    const first = await createCompanyFor(userId, 'paul@test.local', someSiret())
    const second = await createCompanyFor(userId, 'paul@test.local', someSiret())

    expect(second.id).toBe(first.id)
  })

  it('laisse un compagnon RETIRE creer la sienne', async () => {
    // `currentCompany` renvoie un membre retire vers l'inscription : le chemin
    // est reel. Sans resurrection de sa ligne, `member_user_id_unique` sautait
    // APRES l'insertion de l'entreprise — 500 sans message, entreprise
    // orpheline, et SIRET plus inscriptible par personne.
    const userId = randomUUID()
    const ancienne = await createCompany()
    await db
      .insert(member)
      .values({ companyId: ancienne, userId, email: 'compagnon@test.local', role: 'member' })
    await db.update(member).set({ removedAt: new Date() }).where(eq(member.userId, userId))

    const siret = someSiret()
    const created = await createCompanyFor(userId, 'compagnon@test.local', siret)

    expect(created.siret).toBe(siret)

    const [row] = await db.select().from(member).where(eq(member.userId, userId))
    expect(row.companyId).toBe(created.id)
    expect(row.role).toBe('owner')
    expect(row.removedAt).toBeNull()
  })

  it('rappelle l API plutot que de croire ce qu on lui passe', async () => {
    // Entre la saisie et l'atterrissage, l'etablissement a pu cesser.
    const siret = someSiret()
    await createCompanyFor(randomUUID(), 'paul@test.local', siret)

    expect(vi.mocked(findEstablishment)).toHaveBeenCalledWith(siret)
  })
})
