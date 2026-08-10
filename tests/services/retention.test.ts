import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { updateDraftQuote } from '@/services/quote-edit'
import { issueInvoice } from '@/services/invoices'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const LINE = { label: 'Pose', unit: 'u', quantity: '1', unitPriceExclTax: 100_000, taxRate: 1000 }

describe('stipuler la retenue au devis', () => {
  it('l enregistre sur le brouillon', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const draft = await signedQuote(companyId, projectId, 'draft')

    await updateDraftQuote(companyId, draft.id, {
      lines: [LINE],
      committedLeadTimeDays: null,
      retentionRate: 5,
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, draft.id))
    expect(row.retentionRate).toBe(5)
  })

  it('REFUSE un taux superieur au plafond legal', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const draft = await signedQuote(companyId, projectId, 'draft')

    await expect(
      updateDraftQuote(companyId, draft.id, {
        lines: [LINE],
        committedLeadTimeDays: null,
        retentionRate: 10,
      }),
    ).rejects.toThrow(/71-584/)
  })

  it('vaut ZERO par defaut', async () => {
    // Facultative : « peuvent etre amputes ». Une retenue par defaut serait une
    // clause imposee au client comme a l'artisan.
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const draft = await signedQuote(companyId, projectId, 'draft')

    const [row] = await db.select().from(quote).where(eq(quote.id, draft.id))
    expect(row.retentionRate).toBe(0)
  })
})

describe('figer la retenue sur la facture', () => {
  /** Un devis signe, retenue de 5 % stipulee. */
  async function withRetention() {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const source = await signedQuote(companyId, projectId, 'signed')
    await db.update(quote).set({ retentionRate: 5 }).where(eq(quote.id, source.id))

    return { companyId, quoteId: source.id }
  }

  const deposit = { ...LINE, unitPriceExclTax: 10_000 }

  it('recopie le taux du devis a l emission', async () => {
    const { companyId, quoteId } = await withRetention()

    const created = await issueInvoice({
      companyId,
      quoteId,
      type: 'deposit',
      dueInDays: 30,
      lines: [deposit],
    })

    const [row] = await db.select().from(invoice).where(eq(invoice.id, created.id))
    expect(row.retentionRate).toBe(5)
  })

  it('ne bouge PLUS quand le devis change ensuite', async () => {
    // Une facture est immuable, ses mentions aussi.
    const { companyId, quoteId } = await withRetention()

    const created = await issueInvoice({
      companyId,
      quoteId,
      type: 'deposit',
      dueInDays: 30,
      lines: [deposit],
    })

    await db.update(quote).set({ retentionRate: 0 }).where(eq(quote.id, quoteId))

    const [row] = await db.select().from(invoice).where(eq(invoice.id, created.id))
    expect(row.retentionRate).toBe(5)
  })

  it('n en met AUCUNE sur un avoir', async () => {
    // Un avoir rend de l'argent : rien n'y est retenu.
    const { companyId, quoteId } = await withRetention()

    const invoiced = await issueInvoice({
      companyId,
      quoteId,
      type: 'deposit',
      dueInDays: 30,
      lines: [deposit],
    })

    const credit = await issueInvoice({
      companyId,
      quoteId,
      type: 'credit_note',
      dueInDays: 0,
      correctsInvoiceId: invoiced.id,
      lines: [deposit],
    })

    const [row] = await db.select().from(invoice).where(eq(invoice.id, credit.id))
    expect(row.retentionRate).toBe(0)
  })
})
