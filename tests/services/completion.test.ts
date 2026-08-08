import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { quote } from '@/db/schema'
import { declareCompleted, recordInvoicedCompletion } from '@/services/completion'
import { createCompany, createProject, depositLines, signedQuote } from './invoice-fixtures'
import { issueInvoice } from '@/services/invoices'

let COMPANY: string
let PROJECT: string

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

const chantier = () => signedQuote(COMPANY, PROJECT, 'signed')

describe('declaration de fin de chantier', () => {
  it('inscrit la date et sa source', async () => {
    const source = await chantier()
    const done = new Date('2026-08-01T10:00:00Z')

    await declareCompleted(COMPANY, source.id, done)

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(row.completedAt).toEqual(done)
    expect(row.completionSource).toBe('declared')
  })

  it('refuse un devis non signe', async () => {
    const draft = await signedQuote(COMPANY, PROJECT, 'sent')
    await expect(declareCompleted(COMPANY, draft.id, new Date())).rejects.toThrow('signé')
  })

  it('refuse un devis d une autre entreprise', async () => {
    const other = await createCompany()
    const source = await chantier()
    await expect(declareCompleted(other, source.id, new Date())).rejects.toThrow('introuvable')
  })
})

describe('audit par la facture de solde', () => {
  it('remplace une date declaree', async () => {
    // L'acte comptable ne se discute pas contre une declaration.
    const source = await chantier()
    await declareCompleted(COMPANY, source.id, new Date('2026-07-01T10:00:00Z'))

    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'balance',
      dueInDays: 30,
      lines: depositLines(100),
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(row.completionSource).toBe('invoiced')
    expect(row.completedAt!.getTime()).toBeGreaterThan(new Date('2026-07-01').getTime())
  })

  it('ne bouge pas sur un acompte', async () => {
    // Seul le SOLDE constate la reception des travaux.
    const source = await chantier()
    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: depositLines(30),
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(row.completedAt).toBeNull()
  })

  it('est idempotente', async () => {
    const source = await chantier()
    await recordInvoicedCompletion(source.id, new Date('2026-08-01T10:00:00Z'))
    await recordInvoicedCompletion(source.id, new Date('2026-08-05T10:00:00Z'))

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    // La premiere emission fait foi : une seconde ne reecrit pas l'histoire.
    expect(row.completedAt).toEqual(new Date('2026-08-01T10:00:00Z'))
  })
})
