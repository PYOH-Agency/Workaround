import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, customer, invoice, project, property, quote, quoteLine } from '@/db/schema'
import { allocateInvoiceNumber, issueInvoice, issuedAgainstQuote } from '@/services/invoices'
import { remainingByRate, remainingToInvoice, splitDepositByRate } from '@/domain/invoice-balance'
import { computeTotals } from '@/domain/quote-totals'

/**
 * Ces tests n'effacent rien : la facture est immuable par declencheur, et le
 * compteur de sequence survit a la suite.
 *
 * Ils s'isolent donc par entreprise generee, comme le fait deja events.test.ts.
 * S'appuyer sur l'entreprise du jeu de donnees les rendrait dependants d'un
 * `supabase db reset` prealable : le deuxieme `pnpm vitest run` echouerait, avec
 * un compteur deja consomme.
 */
const COMPANY = randomUUID()

/** Un SIRET unique et syntaxiquement plausible, sans collision entre lancements. */
const someSiret = () => randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14)

let PROJECT: string

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: someSiret(),
    legalName: 'Entreprise de test',
    // Mentions completes : sans elles, toute emission est refusee — et le test
    // echouerait pour une raison qui n'est pas celle qu'il verifie.
    legalFormLabel: 'SAS',
    registrationNumber: 'RCS Bordeaux 000 000 000',
    phone: '0556000000',
    email: 'test@local',
    vatNumber: 'FR00000000000',
    paymentTerms: 'Solde à réception',
    insurerName: 'SMABTP',
    insurerAddress: 'Paris',
    policyNumber: 'D-0001',
    coveredActivities: 'Plomberie',
    coverageArea: 'France',
  })

  const [customerRow] = await db
    .insert(customer)
    .values({ companyId: COMPANY, name: 'Client de test', email: 'client@local' })
    .returning()

  const [propertyRow] = await db
    .insert(property)
    .values({
      fingerprint: randomUUID(),
      addressLine1: '1 rue du Test',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    .returning()

  const [projectRow] = await db
    .insert(project)
    .values({
      companyId: COMPANY,
      customerId: customerRow.id,
      propertyId: propertyRow.id,
      label: 'Chantier de test',
    })
    .returning()

  PROJECT = projectRow.id
})

/**
 * Un devis a deux taux de TVA : 850,00 a 10 % et 60,00 a 20 %.
 * Soit 910,00 HT et 1 007,00 TTC — les memes chiffres que le jeu de donnees.
 *
 * Chaque test fabrique le sien : partager un devis rendrait les tests
 * dependants de leur ordre, et la facture etant immuable, rien ne se nettoie.
 */
async function signedQuote(status: 'sent' | 'signed' = 'signed') {
  const [row] = await db
    .insert(quote)
    .values({
      projectId: PROJECT,
      companyId: COMPANY,
      number: `D2026-${randomUUID().slice(0, 8)}`,
      status,
      totalExclTax: 91000,
      totalTax: 9700,
      totalInclTax: 100700,
      publicToken: randomUUID(),
      signedAt: status === 'signed' ? new Date() : null,
    })
    .returning()

  await db.insert(quoteLine).values([
    {
      quoteId: row.id,
      position: 0,
      label: 'Chauffe-eau posé',
      quantity: '1',
      unitPriceExclTax: 85000,
      taxRate: 1000,
    },
    {
      quoteId: row.id,
      position: 1,
      label: 'Déplacement',
      quantity: '1',
      unitPriceExclTax: 6000,
      taxRate: 2000,
    },
  ])

  return row
}

const depositLines = (percent: number) =>
  splitDepositByRate(
    [
      { rate: 1000, baseExclTax: 85000, taxAmount: 8500 },
      { rate: 2000, baseExclTax: 6000, taxAmount: 1200 },
    ],
    percent,
  ).map((line) => ({
    label: `Acompte ${percent} %`,
    unit: 'u',
    quantity: '1',
    unitPriceExclTax: line.unitPriceExclTax,
    taxRate: line.rate,
  }))

afterAll(async () => {
  await connection.end()
})

describe('attribution du numero de facture', () => {
  it('produit une sequence continue', async () => {
    const first = await allocateInvoiceNumber(COMPANY, 2030)
    const second = await allocateInvoiceNumber(COMPANY, 2030)
    const third = await allocateInvoiceNumber(COMPANY, 2030)

    expect(first).toBe('F2030-0001')
    expect(second).toBe('F2030-0002')
    expect(third).toBe('F2030-0003')
  })

  it('ne laisse aucun trou sous concurrence', async () => {
    // Dix attributions simultanees doivent produire dix rangs consecutifs.
    // C'est precisement ce que la reprise sur collision des devis ne garantit
    // pas, et pourquoi la facture exige un compteur incremente en base.
    const numbers = await Promise.all(
      Array.from({ length: 10 }, () => allocateInvoiceNumber(COMPANY, 2031)),
    )

    const sequences = numbers.map((n) => Number(n.split('-')[1])).sort((a, b) => a - b)
    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('repart a 1 sur une nouvelle annee', async () => {
    expect(await allocateInvoiceNumber(COMPANY, 2032)).toBe('F2032-0001')
  })

  it('rend le rang si la transaction echoue', async () => {
    // La raison d'etre du parametre de transaction. Attribuer le rang hors de
    // la transaction qui insere la facture laisserait un trou au premier echec
    // — precisement le manquement comptable que toute cette conception evite.
    expect(await allocateInvoiceNumber(COMPANY, 2033)).toBe('F2033-0001')

    await db
      .transaction(async (tx) => {
        await allocateInvoiceNumber(COMPANY, 2033, tx)
        throw new Error('echec apres attribution')
      })
      .catch(() => {})

    expect(await allocateInvoiceNumber(COMPANY, 2033)).toBe('F2033-0002')
  })
})

describe('emission des factures', () => {
  it('refuse de facturer un devis non signe', async () => {
    const source = await signedQuote('sent')

    await expect(
      issueInvoice({
        companyId: COMPANY,
        quoteId: source.id,
        type: 'balance',
        dueInDays: 30,
        lines: depositLines(100),
      }),
    ).rejects.toThrow('signe')
  })

  it('emet un acompte ventile sur les deux taux', async () => {
    const source = await signedQuote()

    const created = await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: depositLines(30),
    })

    // 255,00 a 10 % et 18,00 a 20 % : 273,00 HT, 302,10 TTC. Un taux unique
    // applique a ce devis donnerait 300,30 TTC — une TVA fausse.
    expect(created.totalExclTax).toBe(27300)
    expect(created.totalInclTax).toBe(30210)
    expect(created.number).toMatch(/^F\d{4}-\d{4,}$/)
  })

  it('refuse un solde superieur au reste a facturer', async () => {
    const source = await signedQuote()
    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: depositLines(30),
    })

    await expect(
      issueInvoice({
        companyId: COMPANY,
        quoteId: source.id,
        type: 'balance',
        dueInDays: 30,
        lines: depositLines(100),
      }),
    ).rejects.toThrow('depasse')
  })

  it("n'applique pas le plafond a un avoir", async () => {
    // Un avoir reduit la facturation : le controle de depassement n'a pas de
    // sens pour lui, et l'appliquer empecherait de corriger une erreur.
    const source = await signedQuote()
    const deposit = await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: depositLines(100),
    })

    const credit = await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'credit_note',
      dueInDays: 0,
      correctsInvoiceId: deposit.id,
      lines: depositLines(100),
    })

    expect(credit.type).toBe('credit_note')
    expect(remainingToInvoice(source.totalInclTax, await issuedAgainstQuote(source.id))).toBe(100700)
  })

  it('solde un devis au centime pres apres trois situations arrondies', async () => {
    // Le defaut qu'un solde calcule en pourcentage du reste TTC produirait :
    // trois arrondis successifs laissent un residu qu'aucune facture ne peut
    // solder, et le devis reste indefiniment ouvert.
    const source = await signedQuote()
    const totals = computeTotals([
      { quantity: '1', unitPriceExclTax: 85000, taxRate: 1000 },
      { quantity: '1', unitPriceExclTax: 6000, taxRate: 2000 },
    ])

    for (const percent of [33, 33, 33]) {
      await issueInvoice({
        companyId: COMPANY,
        quoteId: source.id,
        type: 'progress',
        dueInDays: 30,
        lines: depositLines(percent),
      })
    }

    const balance = remainingByRate(totals.byRate, await issuedAgainstQuote(source.id))
    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'balance',
      dueInDays: 30,
      lines: balance.map((line) => ({
        label: 'Solde',
        unit: 'u',
        quantity: '1',
        unitPriceExclTax: line.unitPriceExclTax,
        taxRate: line.rate,
      })),
    })

    expect(remainingToInvoice(source.totalInclTax, await issuedAgainstQuote(source.id))).toBe(0)
  })

  it('produit une sequence sans trou sur toutes les factures emises', async () => {
    const rows = await db.query.invoice.findMany({ where: eq(invoice.companyId, COMPANY) })
    const sequences = rows
      .map((row) => Number(row.number.split('-')[1]))
      .sort((a, b) => a - b)

    expect(sequences).toEqual(Array.from({ length: sequences.length }, (_, i) => i + 1))
  })
})
