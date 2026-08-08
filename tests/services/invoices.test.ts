import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { issueInvoice, issuedAgainstQuote } from '@/services/invoices'
import { remainingByRate, remainingToInvoice } from '@/domain/invoice-balance'
import { computeTotals } from '@/domain/quote-totals'
import { createCompany, createProject, depositLines, signedQuote } from './invoice-fixtures'

let COMPANY: string
let PROJECT: string

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

const quoteFor = (status: 'sent' | 'signed' = 'signed') => signedQuote(COMPANY, PROJECT, status)

describe('emission des factures', () => {
  it('refuse de facturer un devis non signe', async () => {
    const source = await quoteFor('sent')

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
    const source = await quoteFor()

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
    const source = await quoteFor()
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
    const source = await quoteFor()
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
    const source = await quoteFor()
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
    const sequences = rows.map((row) => Number(row.number.split('-')[1])).sort((a, b) => a - b)

    expect(sequences).toEqual(Array.from({ length: sequences.length }, (_, i) => i + 1))
  })
})

describe('facturation apres avenant', () => {
  it('autorise a facturer jusqu au total de l avenant signe', async () => {
    const source = await quoteFor()

    // Le devis vaut 1 007,00. On facture tout.
    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'balance',
      dueInDays: 30,
      lines: depositLines(100),
    })

    // Sans avenant, plus rien n'est facturable.
    await expect(
      issueInvoice({
        companyId: COMPANY,
        quoteId: source.id,
        type: 'progress',
        dueInDays: 30,
        lines: depositLines(10),
      }),
    ).rejects.toThrow('integralement facture')

    // Un avenant signe portant le total a 2 014,00 rouvre la facturation.
    const [amendment] = await db
      .insert(quote)
      .values({
        projectId: source.projectId,
        companyId: COMPANY,
        number: source.number,
        version: 2,
        status: 'signed',
        totalExclTax: 182000,
        totalTax: 19400,
        totalInclTax: 201400,
        publicToken: randomUUID(),
        supersedesQuoteId: source.id,
        signedAt: new Date(),
      })
      .returning()

    // La facture s'attache toujours a la RACINE, pas a l'avenant.
    const extra = await issueInvoice({
      companyId: COMPANY,
      quoteId: amendment.id,
      type: 'progress',
      dueInDays: 30,
      lines: depositLines(10),
    })

    expect(extra.quoteId).toBe(source.id)
  })
})
