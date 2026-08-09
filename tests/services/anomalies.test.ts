import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { anomalyReview, company, insuranceCertificate } from '@/db/schema'
import { currentAnomalies } from '@/services/anomalies'

const COMPANY = randomUUID()

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
    legalName: 'SANS ADRESSE',
    email: null,
  })

  // Une attestation validee dont l'echeance approche, sur une entreprise
  // injoignable : bloquant.
  await db.insert(insuranceCertificate).values({
    companyId: COMPANY,
    kind: 'decennale',
    storagePath: `${COMPANY}/a.pdf`,
    status: 'validated',
    validFrom: new Date('2026-01-01'),
    validUntil: new Date(Date.now() + 30 * 86_400_000),
  })
})

afterAll(async () => {
  await connection.end()
})

describe('file d anomalies', () => {
  it('remonte l entreprise qu on ne peut pas prevenir', async () => {
    const found = await currentAnomalies(new Date())
    const mine = found.filter((a) => a.subjectId === COMPANY)

    expect(mine).toHaveLength(1)
    expect(mine[0].type).toBe('unreachable_company')
    expect(mine[0].severity).toBe('blocking')
  })

  it('ne rend jamais une anomalie moins grave avant une plus grave', async () => {
    const order = { blocking: 0, attention: 1, signal: 2 }
    const found = await currentAnomalies(new Date())

    const ranks = found.map((a) => order[a.severity])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('masque une anomalie examinee, et la fait resurgir sur un fait nouveau', async () => {
    const [target] = (await currentAnomalies(new Date())).filter((a) => a.subjectId === COMPANY)

    await db.insert(anomalyReview).values({
      type: target.type,
      subjectId: target.subjectId,
      factsFingerprint: target.fingerprint,
      verdict: 'benign',
      note: 'Contact obtenu par téléphone, adresse à saisir.',
      reviewedBy: randomUUID(),
    })

    expect((await currentAnomalies(new Date())).filter((a) => a.subjectId === COMPANY)).toEqual([])

    // Les faits changent : l'echeance est repoussee, donc l'empreinte aussi.
    // L'anomalie doit RESURGIR — c'est la propriete qui empeche l'aveuglement.
    await db
      .update(insuranceCertificate)
      .set({ validUntil: new Date(Date.now() + 20 * 86_400_000) })
      .where(eq(insuranceCertificate.companyId, COMPANY))

    const after = (await currentAnomalies(new Date())).filter((a) => a.subjectId === COMPANY)

    expect(after).toHaveLength(1)
    expect(after[0].fingerprint).not.toBe(target.fingerprint)
  })
})

describe('divergence entre fin declaree et solde', () => {
  it('retrouve la date declaree dans le journal, apres que le solde l a ecrasee', async () => {
    const { createCompany, createProject, depositLines, signedQuote } = await import(
      './invoice-fixtures'
    )
    const { declareCompleted } = await import('@/services/completion')
    const { issueInvoice } = await import('@/services/invoices')
    const { quote } = await import('@/db/schema')

    const firm = await createCompany()
    const site = await createProject(firm)
    const source = await signedQuote(firm, site, 'signed')

    // Declare termine il y a trente jours, solde aujourd'hui : l'ecart depasse
    // largement les sept jours du seuil.
    await declareCompleted(firm, source.id, new Date(Date.now() - 30 * 86_400_000))
    await issueInvoice({
      companyId: firm,
      quoteId: source.id,
      type: 'balance',
      dueInDays: 30,
      lines: depositLines(100),
    })

    // Le devis ne porte plus que la date authentifiee.
    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(row.completionSource).toBe('invoiced')

    // Et pourtant l'anomalie est detectee : la declaration survit au journal.
    const found = (await currentAnomalies(new Date())).filter((a) => a.subjectId === source.id)

    expect(found).toHaveLength(1)
    expect(found[0].type).toBe('completion_drift')
    expect(found[0].detail).toContain('30 jours avant')
  })
})
