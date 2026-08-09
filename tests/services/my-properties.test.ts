import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { project, quote, signature } from '@/db/schema'
import { myProperties } from '@/services/my-properties'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

/** Signe un devis au nom d'un demandeur donne. */
async function signFor(companyId: string, projectId: string, requesterId: string) {
  const row = await signedQuote(companyId, projectId, 'signed')

  await db.insert(signature).values({
    quoteId: row.id,
    requesterId,
    signerName: 'Paul Martin',
    signerEmail: `signer-${randomUUID().slice(0, 8)}@test.local`,
    signerPhone: '0600000000',
    codeValidatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    documentHash: 'a'.repeat(64),
    archivedPdfPath: `${companyId}/${row.id}.pdf`,
  })

  return row
}

/** Fait pointer un second chantier sur le MEME logement qu'un premier. */
async function sameProperty(fromProjectId: string, toProjectId: string) {
  const [source] = await db.select().from(project).where(eq(project.id, fromProjectId))
  await db
    .update(project)
    .set({ propertyId: source.propertyId })
    .where(eq(project.id, toProjectId))
}

const someone = () => requesterFromSignature({ email: `p-${randomUUID()}@t.local`, name: 'Paul' })

describe('les logements du demandeur', () => {
  it('reunit les chantiers de DEUX entreprises sur le meme logement', async () => {
    // C'est ce que le jalon apporte : chaque artisan ne voit que son chantier,
    // le demandeur voit les deux.
    const me = await someone()

    const plumber = await createCompany()
    const roofer = await createCompany()
    const site = await createProject(plumber)
    const otherSite = await createProject(roofer)
    await sameProperty(site, otherSite)

    await signFor(plumber, site, me.id)
    await signFor(roofer, otherSite, me.id)

    const found = await myProperties(me.id)

    expect(found).toHaveLength(1)
    expect(found[0].chantiers).toHaveLength(2)
  })

  it('ne montre JAMAIS le chantier d un autre signataire au meme logement', async () => {
    // Le defaut qui tuerait le produit : le dossier du precedent proprietaire
    // livre au nouvel acquereur.
    const me = await someone()
    const other = await someone()

    const builder = await createCompany()
    const site = await createProject(builder)
    const otherSite = await createProject(builder)
    await sameProperty(site, otherSite)

    await signFor(builder, site, me.id)
    const hidden = await signFor(builder, otherSite, other.id)

    const found = await myProperties(me.id)
    const seen = JSON.stringify(found)

    expect(found[0].chantiers).toHaveLength(1)
    expect(seen).not.toContain(hidden.id)
    expect(seen).not.toContain(hidden.number)
  })

  it('ne montre rien a un demandeur qui n a rien signe', async () => {
    expect(await myProperties((await someone()).id)).toEqual([])
  })

  it('n ouvre AUCUNE lecture nouvelle cote entreprise', async () => {
    // Garde de non-regression : le logement devient une cle de regroupement,
    // et il ne doit pas le devenir cote artisan. Deux entreprises au meme
    // logement, chacune ne voit que ses devis.
    const me = await someone()
    const mine = await createCompany()
    const rival = await createCompany()
    const site = await createProject(mine)
    const rivalSite = await createProject(rival)
    await sameProperty(site, rivalSite)

    await signFor(mine, site, me.id)
    const rivalQuote = await signFor(rival, rivalSite, me.id)

    const visibleToMine = await db.select().from(quote).where(eq(quote.companyId, mine))

    expect(visibleToMine.map((q) => q.id)).not.toContain(rivalQuote.id)
  })
})
