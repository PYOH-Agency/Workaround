import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { quote, invoice, payment } from '@/db/schema'
import { moneyInFlight } from '@/services/home'
import { createCompany, createProject } from './invoice-fixtures'

/**
 * `project` exige un client ET un logement, tous deux `NOT NULL`. Les fixtures
 * partagees les creent deja — cinq suites s'en servent, et une sixieme copie
 * des inserts a la main divergerait a la premiere migration.
 */
let COMPANY: string
let PROJECT: string

const now = new Date('2026-08-10T09:00:00Z')

async function signedQuote(totalInclTax: number): Promise<string> {
  const id = randomUUID()
  await db.insert(quote).values({
    id,
    companyId: COMPANY,
    projectId: PROJECT,
    number: `D2026-${id.slice(0, 4)}`,
    status: 'signed',
    signedAt: new Date('2026-06-01T09:00:00Z'),
    totalExclTax: totalInclTax,
    totalTax: 0,
    totalInclTax,
    publicToken: randomUUID(),
  })
  return id
}

async function issuedInvoice(input: {
  quoteId: string
  totalInclTax: number
  dueAt: Date
  retentionRate?: number
}): Promise<string> {
  const id = randomUUID()
  await db.insert(invoice).values({
    id,
    companyId: COMPANY,
    projectId: PROJECT,
    quoteId: input.quoteId,
    number: `F2026-${id.slice(0, 4)}`,
    type: 'balance',
    dueAt: input.dueAt,
    totalExclTax: input.totalInclTax,
    totalTax: 0,
    totalInclTax: input.totalInclTax,
    latePaymentRate: '10',
    recoveryIndemnity: 4000,
    retentionRate: input.retentionRate ?? 0,
    operationType: 'services',
    publicToken: randomUUID(),
  })
  return id
}

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

describe('l argent en cours', () => {
  it('compte comme carnet de commandes ce qui est signe et pas encore facture', async () => {
    // Un devis signe dont le chantier n'a pas commence n'est pas du travail
    // fait : c'est une commande, et le libelle de l'ecran le dit ainsi.
    await signedQuote(500_000)

    const money = await moneyInFlight(COMPANY, now)

    expect(money.signedNotInvoiced).toBe(500_000)
    expect(money.invoicedOnTime).toBe(0)
    expect(money.overdue).toBe(0)
  })

  it('deplace le montant vers l encours des qu il est facture', async () => {
    const quoteId = await signedQuote(300_000)
    await issuedInvoice({ quoteId, totalInclTax: 300_000, dueAt: new Date('2026-09-01T00:00:00Z') })

    const money = await moneyInFlight(COMPANY, now)

    expect(money.signedNotInvoiced).toBe(500_000)
    expect(money.invoicedOnTime).toBe(300_000)
  })

  it('classe en retard une facture echue et impayee', async () => {
    const quoteId = await signedQuote(210_000)
    await issuedInvoice({ quoteId, totalInclTax: 210_000, dueAt: new Date('2026-07-29T00:00:00Z') })

    const money = await moneyInFlight(COMPANY, now)

    expect(money.overdue).toBe(210_000)
  })

  it('exclut du retard ce que le client a le droit de retenir', async () => {
    // Reclamer une retenue de garantie est une faute que l'accueil ne doit pas
    // industrialiser : sans reception declaree, la somme reste retenue.
    const quoteId = await signedQuote(100_000)
    await issuedInvoice({
      quoteId,
      totalInclTax: 100_000,
      // En POINTS de pourcentage entiers, plafonnes a 5 par la loi 71-584 —
      // voir `assertRetentionRate`. En points de base, 500 retiendrait cinq
      // fois le montant de la facture.
      dueAt: new Date('2026-07-01T00:00:00Z'),
      retentionRate: 5,
    })

    const money = await moneyInFlight(COMPANY, now)

    // 210 000 du test precedent, plus 95 000 ici : les 5 000 retenus sortent.
    expect(money.overdue).toBe(305_000)
  })

  it('compte les encaissements des douze derniers mois, et pas au-dela', async () => {
    const quoteId = await signedQuote(80_000)
    const invoiceId = await issuedInvoice({
      quoteId,
      totalInclTax: 80_000,
      dueAt: new Date('2026-08-30T00:00:00Z'),
    })

    await db.insert(payment).values([
      { invoiceId, amount: 50_000, receivedAt: new Date('2026-03-01T09:00:00Z'), method: 'transfer' },
      { invoiceId, amount: 30_000, receivedAt: new Date('2025-01-01T09:00:00Z'), method: 'transfer' },
    ])

    const money = await moneyInFlight(COMPANY, now)

    expect(money.cashedLast12Months).toBe(50_000)
  })

  it('retient le dernier avenant signe, jamais le devis d origine', async () => {
    // Un avenant REMPLACE le total precedent. L'additionner doublerait le
    // chantier ; retenir l'origine sous-estimerait le carnet de commandes de
    // tout ce que l'avenant a ajoute.
    const root = await signedQuote(400_000)
    await db.insert(quote).values({
      id: randomUUID(),
      companyId: COMPANY,
      projectId: PROJECT,
      number: 'D2026-9001',
      version: 2,
      supersedesQuoteId: root,
      status: 'signed',
      signedAt: new Date('2026-06-15T09:00:00Z'),
      totalExclTax: 450_000,
      totalTax: 0,
      totalInclTax: 450_000,
      publicToken: randomUUID(),
    })

    const money = await moneyInFlight(COMPANY, now)

    // 500 000 des cas precedents, plus les 450 000 de l'avenant — et non les
    // 400 000 de l'origine, ni les 850 000 des deux additionnes.
    expect(money.signedNotInvoiced).toBe(950_000)
  })

  it('ne compte pas un avoir comme une creance', async () => {
    // Un avoir diminue ce qui est du. Le compter parmi les factures gonflerait
    // l'encours du montant qu'il annule.
    const quoteId = await signedQuote(60_000)
    await issuedInvoice({ quoteId, totalInclTax: 60_000, dueAt: new Date('2026-09-01T00:00:00Z') })

    const credit = randomUUID()
    await db.insert(invoice).values({
      id: credit,
      companyId: COMPANY,
      projectId: PROJECT,
      quoteId,
      number: `A2026-${credit.slice(0, 4)}`,
      type: 'credit_note',
      dueAt: new Date('2026-09-01T00:00:00Z'),
      totalExclTax: 60_000,
      totalTax: 0,
      totalInclTax: 60_000,
      latePaymentRate: '10',
      recoveryIndemnity: 4000,
      retentionRate: 0,
      operationType: 'services',
      publicToken: randomUUID(),
    })

    const money = await moneyInFlight(COMPANY, now)

    // 300 000 du deuxieme cas, plus les 60 000 de la facture. L'avoir n'y est
    // pas : sans son exclusion, on lirait 420 000.
    expect(money.invoicedOnTime).toBe(360_000)
  })
})
