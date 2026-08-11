import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { quote, invoice } from '@/db/schema'
import { pendingTasks } from '@/services/home-tasks'
import type { Access } from '@/domain/authorization'
import { createCompany, createProject } from './invoice-fixtures'

/**
 * Le reste a facturer d'un chantier avenante, isole de `home-tasks.test.ts` :
 * ce fichier depasserait 250 lignes avec ce decor en plus, et `home-tasks`
 * porte deja des assertions d'egalite stricte qu'un cinquieme chantier
 * perturberait sans rapport avec ce qu'elles verifient.
 */
let COMPANY: string
let PROJECT: string

const now = new Date('2026-08-10T09:00:00Z')
const OWNER: Access = { plan: 'free', role: 'owner' }

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

describe('le reste a facturer, avec avenant', () => {
  it('reclame le solde sur le total engage de la chaine, pas sur le devis d origine', async () => {
    // Meme decor que « retient le dernier avenant signe, jamais le devis
    // d'origine » dans home-money.test.ts : un avenant REMPLACE le total
    // precedent, il ne s'y ajoute pas.
    const root = randomUUID()
    await db.insert(quote).values({
      id: root,
      companyId: COMPANY,
      projectId: PROJECT,
      number: 'D2026-2001',
      status: 'signed',
      signedAt: new Date('2026-05-01T09:00:00Z'),
      // Assez ancien pour depasser les trois jours ouvres du seuil.
      completedAt: new Date('2026-07-20T09:00:00Z'),
      totalExclTax: 900_000,
      totalTax: 0,
      totalInclTax: 900_000,
      publicToken: randomUUID(),
    })

    // Le devis d'origine est entierement facture.
    await db.insert(invoice).values({
      id: randomUUID(),
      companyId: COMPANY,
      projectId: PROJECT,
      quoteId: root,
      number: 'F2026-2001',
      type: 'balance',
      // Dans le futur : sans rapport avec ce test, qui porte sur le reste a
      // facturer et non sur le retard de paiement.
      dueAt: new Date('2026-12-01T00:00:00Z'),
      totalExclTax: 900_000,
      totalTax: 0,
      totalInclTax: 900_000,
      latePaymentRate: '10',
      recoveryIndemnity: 4000,
      retentionRate: 0,
      operationType: 'services',
      publicToken: randomUUID(),
    })

    // L'avenant porte le total engage a 950 000 : 50 000 restent facturables,
    // bien que le devis d'origine soit deja solde.
    await db.insert(quote).values({
      id: randomUUID(),
      companyId: COMPANY,
      projectId: PROJECT,
      number: 'D2026-2001',
      version: 2,
      supersedesQuoteId: root,
      status: 'signed',
      signedAt: new Date('2026-06-15T09:00:00Z'),
      totalExclTax: 950_000,
      totalTax: 0,
      totalInclTax: 950_000,
      publicToken: randomUUID(),
    })

    const task = (await pendingTasks(COMPANY, OWNER, now)).find(
      (t) => t.kind === 'unbilled_completion',
    )

    // Avec `remainingToInvoice` calcule sur le devis d'origine (900 000), le
    // reste vaudrait 0 et cette ligne n'apparaitrait jamais : l'artisan ne
    // serait jamais relance pour le solde de l'avenant.
    expect(task?.amountInclTax).toBe(50_000)
  })
})
