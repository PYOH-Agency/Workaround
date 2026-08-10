// tests/services/home-tasks.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { quote, invoice, payment, insuranceCertificate } from '@/db/schema'
import { pendingTasks } from '@/services/home-tasks'
import type { Access } from '@/domain/authorization'
import { createCompany, createProject } from './invoice-fixtures'

/** Memes fixtures partagees que `home-money.test.ts` : `project` exige un client et un logement. */
let COMPANY: string
let PROJECT: string

/**
 * Une seconde entreprise, aux quatre natures presentes a la fois.
 *
 * `COMPANY` porte deja une assertion d'egalite stricte sur exactement deux
 * natures (`toEqual(['certificate', 'silent_quote'])`) : y ajouter la facture
 * echue et le chantier non solde la ferait echouer sans rapport avec ce
 * qu'elle verifie. Une entreprise dediee isole le decor a quatre natures dont
 * `overdue_invoice` et `unbilled_completion` ont besoin.
 */
let COMPANY2: string
let PROJECT2: string

const now = new Date('2026-08-10T09:00:00Z')

const OWNER: Access = { plan: 'free', role: 'owner' }
const MEMBER: Access = { plan: 'free', role: 'member' }

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)

  // Un devis envoye il y a plus de sept jours ouvres.
  await db.insert(quote).values({
    id: randomUUID(),
    companyId: COMPANY,
    projectId: PROJECT,
    number: 'D2026-0001',
    status: 'sent',
    sentAt: new Date('2026-07-23T09:00:00Z'),
    validityDays: 90,
    totalExclTax: 100_700,
    totalTax: 0,
    totalInclTax: 100_700,
    publicToken: randomUUID(),
  })

  await db.insert(insuranceCertificate).values({
    id: randomUUID(),
    companyId: COMPANY,
    kind: 'decennale',
    status: 'validated',
    validUntil: new Date('2026-08-31T00:00:00Z'),
    storagePath: `${COMPANY}/attestation.pdf`,
  })

  COMPANY2 = await createCompany()
  PROJECT2 = await createProject(COMPANY2)

  // Meme attestation et meme devis muet que sur COMPANY, pour que le tri
  // s'exerce sur les quatre natures a la fois.
  await db.insert(insuranceCertificate).values({
    id: randomUUID(),
    companyId: COMPANY2,
    kind: 'decennale',
    status: 'validated',
    validUntil: new Date('2026-09-15T00:00:00Z'),
    storagePath: `${COMPANY2}/attestation.pdf`,
  })

  await db.insert(quote).values({
    id: randomUUID(),
    companyId: COMPANY2,
    projectId: PROJECT2,
    number: 'D2026-1001',
    status: 'sent',
    sentAt: new Date('2026-07-20T09:00:00Z'),
    validityDays: 90,
    totalExclTax: 50_000,
    totalTax: 0,
    totalInclTax: 50_000,
    publicToken: randomUUID(),
  })

  /**
   * Un devis signe, chantier termine, et une facture partiellement payee dont
   * l'echeance est passee : un seul decor produit a la fois `overdue_invoice`
   * (le solde restant est exigible et en retard) et `unbilled_completion` (la
   * facture emise ne couvre qu'une partie du devis).
   */
  const completedQuoteId = randomUUID()
  await db.insert(quote).values({
    id: completedQuoteId,
    companyId: COMPANY2,
    projectId: PROJECT2,
    number: 'D2026-1002',
    status: 'signed',
    signedAt: new Date('2026-06-01T09:00:00Z'),
    completedAt: new Date('2026-08-03T09:00:00Z'),
    totalExclTax: 200_000,
    totalTax: 0,
    totalInclTax: 200_000,
    publicToken: randomUUID(),
  })

  const overdueInvoiceId = randomUUID()
  await db.insert(invoice).values({
    id: overdueInvoiceId,
    companyId: COMPANY2,
    projectId: PROJECT2,
    quoteId: completedQuoteId,
    number: 'F2026-1001',
    type: 'balance',
    dueAt: new Date('2026-07-01T00:00:00Z'),
    totalExclTax: 100_000,
    totalTax: 0,
    totalInclTax: 100_000,
    latePaymentRate: '10',
    recoveryIndemnity: 4000,
    retentionRate: 0,
    operationType: 'services',
    publicToken: randomUUID(),
  })

  // Paye en partie : il reste 60 000 exigibles, et l'echeance du premier
  // juillet est deja passee — donc `overdue`, pas `partially_paid`.
  await db.insert(payment).values({
    invoiceId: overdueInvoiceId,
    amount: 40_000,
    receivedAt: new Date('2026-07-15T09:00:00Z'),
    method: 'transfer',
  })
})

afterAll(async () => {
  await connection.end()
})

describe('la file de l accueil', () => {
  it('remonte le devis muet et l attestation qui expire', async () => {
    const tasks = await pendingTasks(COMPANY, OWNER, now)

    expect(tasks.map((t) => t.kind)).toEqual(['certificate', 'silent_quote'])
  })

  it('classe l attestation avant le devis, quelle que soit l anciennete', async () => {
    // L'attestation expire dans 21 jours, le devis attend depuis 18 : un tri
    // par date seule inverserait les deux, alors que seule la premiere coupe
    // la visibilite publique du passeport.
    const [first] = await pendingTasks(COMPANY, OWNER, now)

    expect(first.kind).toBe('certificate')
    expect(first.action).toBe('Déposer l’attestation')
    expect(first.href).toBe('/verification')
  })

  it('porte le montant du devis, pour que la ligne se lise sans l ouvrir', async () => {
    const quoteTask = (await pendingTasks(COMPANY, OWNER, now)).find((t) => t.kind === 'silent_quote')

    expect(quoteTask?.amountInclTax).toBe(100_700)
    expect(quoteTask?.title).toContain('D2026-0001')
  })

  it('ne rend aucune ligne a un compagnon', async () => {
    // Les quatre gestes exigent tous une capacite qu'il n'a pas : sa file est
    // vide, et une bande vide ne s'affiche pas.
    expect(await pendingTasks(COMPANY, MEMBER, now)).toEqual([])
  })

  it('remonte la facture echue et le chantier non solde', async () => {
    // Les quatre natures existent : sans donnees pour les deux dernieres, leur
    // selection et leur garde de capacite ne sont prouvees par rien.
    const kinds = (await pendingTasks(COMPANY2, OWNER, now)).map((t) => t.kind)

    expect(kinds).toContain('overdue_invoice')
    expect(kinds).toContain('unbilled_completion')
  })

  it('classe par nature, quel que soit l ordre de collecte', async () => {
    // `pendingTasks` empile le devis avant la facture ; le tri doit les
    // inverser. Sans cet appel a `orderTasks`, la file sort dans l'ordre des
    // requetes, qui ne veut rien dire pour l'artisan.
    const kinds = (await pendingTasks(COMPANY2, OWNER, now)).map((t) => t.kind)

    expect(kinds).toEqual(['certificate', 'overdue_invoice', 'silent_quote', 'unbilled_completion'])
  })
})
