import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { quote } from '@/db/schema'
import { companyMetrics } from '@/services/passport-metrics'
import { createCompany, createProject, depositLines, signedQuote } from './invoice-fixtures'
import { issueInvoice } from '@/services/invoices'
import { declareCompleted } from '@/services/completion'
import { openDispute } from '@/services/disputes'
import { lateChantier } from './dispute-fixtures'

let COMPANY: string
let PROJECT: string

/** Dix chantiers termines, dont un facture au-dela de son devis initial. */
beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)

  for (let i = 0; i < 10; i++) {
    const source = await signedQuote(COMPANY, PROJECT, 'signed')

    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'balance',
      dueInDays: 30,
      lines: depositLines(100),
    })

    // Le dixieme depasse : un avenant signe porte le total, et l'on facture
    // au-dela du devis d'origine.
    if (i === 9) {
      await db.insert(quote).values({
        projectId: PROJECT,
        companyId: COMPANY,
        number: source.number,
        version: 2,
        status: 'signed',
        totalInclTax: 201400,
        publicToken: randomUUID(),
        supersedesQuoteId: source.id,
        signedAt: new Date(),
      })

      await issueInvoice({
        companyId: COMPANY,
        quoteId: source.id,
        type: 'progress',
        dueInDays: 30,
        lines: depositLines(50),
      })
    }
  }
})

afterAll(async () => {
  await connection.end()
})

describe('metriques d une entreprise', () => {
  it('rend le taux et le volume ensemble', async () => {
    const metrics = await companyMetrics(COMPANY, new Date())

    // Neuf chantiers sur dix factures au prix du devis initial.
    expect(metrics.quoteToInvoiceGap.value).toBe(90)
    expect(metrics.quoteToInvoiceGap.volume).toBe(10)
  })

  it('ne compte pas l avenant comme un chantier de plus', async () => {
    // Un avenant est une version, pas un nouveau chantier : le compter
    // gonflerait le volume sans qu'aucun travail supplementaire ait eu lieu.
    expect((await companyMetrics(COMPANY, new Date())).completed.total).toBe(10)
  })

  it("ne compte jamais un chantier dont le devis n'est pas signe", async () => {
    // Sans signature, l'artisan saisirait son propre devis et sa propre
    // facture : la metrique serait auto-declaree.
    const unsigned = await signedQuote(COMPANY, PROJECT, 'sent')
    await db
      .update(quote)
      .set({ completedAt: new Date(), completionSource: 'declared' })
      .where(eq(quote.id, unsigned.id))

    expect((await companyMetrics(COMPANY, new Date())).completed.total).toBe(10)
  })

  it('compte un chantier declare termine sans facture de solde', async () => {
    // La declaration compte immediatement : refuser penaliserait l'artisan
    // honnete qui ne solde pas tout de suite.
    const source = await signedQuote(COMPANY, PROJECT, 'signed')
    await declareCompleted(COMPANY, source.id, new Date())

    expect((await companyMetrics(COMPANY, new Date())).completed.total).toBe(11)
  })
})

describe('exclusion du chantier conteste', () => {
  it('sort du taux de delai un chantier en cours d instruction', async () => {
    // L'exigence de l'AIPD, verifiee au niveau du service : l'exclusion est
    // portee par la REQUETE, jamais par un filtre d'affichage. Un ecran qui
    // oublierait de filtrer publierait un chiffre conteste.
    const { companyId, quoteId } = await lateChantier()

    const before = await companyMetrics(companyId, new Date())
    expect(before.leadTimeRespect.volume).toBe(1)

    await openDispute(companyId, quoteId, 'Client absent.', new Date())

    const after = await companyMetrics(companyId, new Date())
    expect(after.leadTimeRespect.volume).toBe(0)
    // Le chantier reste compte : c'est ce qui rend l'abus visible.
    expect(after.completed.window).toBe(1)
  })

  it('y ramene le chantier quand le delai passe sans reponse', async () => {
    const { companyId, quoteId } = await lateChantier()
    await openDispute(companyId, quoteId, 'Client absent.', new Date())

    // Quinze jours plus tard, sans qu'aucune tache planifiee n'ait tourne.
    const later = new Date(Date.now() + 15 * 86_400_000)
    expect((await companyMetrics(companyId, later)).leadTimeRespect.volume).toBe(1)
  })
})
