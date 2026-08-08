import { describe, it, expect } from 'vitest'
import { fetchCollectiveProceedings } from '@/services/legal-checks'
import { fetchRgeRows } from '@/services/rge-lookup'
import { activeQualifications } from '@/domain/rge'

/**
 * Ces tests appellent les vraies API ouvertes.
 *
 * Ils sont les seuls a reveler un changement de contrat cote fournisseur : en
 * M1, des fixtures ecrites a la main avaient valide un champ que l'API ne
 * renvoyait pas, et seul un appel reel l'avait montre.
 */
const SIREN = '507698207'
const SIRET = '50769820700036'

describe('BODACC, en vrai', () => {
  it('renvoie des familles normalisees et non du texte libre', async () => {
    const families = await fetchCollectiveProceedings(SIREN)
    const known = [
      'collective', 'conciliation', 'creation', 'divers', 'dpc', 'immatriculation',
      'inconnue', 'modification', 'radiation', 'retablissement_professionnel', 'vente',
    ]
    expect(families.length).toBeGreaterThan(0)
    for (const family of families) expect(known).toContain(family)
  })
})

describe('ADEME RGE, en vrai', () => {
  it('renvoie les dates de validite et l organisme certificateur', async () => {
    const rows = await fetchRgeRows(SIRET)
    expect(rows.length).toBeGreaterThan(0)

    // Les trois champs sur lesquels repose l'affichage du RGE.
    expect(rows[0].lien_date_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(rows[0].code_qualification).toBeTruthy()
    expect(rows[0].organisme).toBeTruthy()

    expect(activeQualifications(rows, new Date()).length).toBeGreaterThan(0)
  })
})

describe('enregistrement des controles', () => {
  it('ecrit un constat date par source, et journalise la transition', async () => {
    const { randomUUID } = await import('node:crypto')
    const { and, eq } = await import('drizzle-orm')
    const { db, connection } = await import('@/db/client')
    const { company, legalCheck, event } = await import('@/db/schema')
    const { runLegalChecks } = await import('@/services/legal-checks')

    // Le SIRET est unique en base et les tests d'integration ne reinitialisent
    // rien : on reprend l'entreprise du jeu de donnees plutot que d'en creer une
    // qui entrerait en collision au deuxieme lancement. L'isolation porte donc
    // sur les constats, pas sur l'entreprise.
    const [existing] = await db.select().from(company).where(eq(company.siret, SIRET))
    const COMPANY = existing?.id ?? randomUUID()
    if (!existing) {
      await db.insert(company).values({ id: COMPANY, siret: SIRET, legalName: 'Entreprise de test' })
    }

    const before = await db
      .select()
      .from(event)
      .where(and(eq(event.subjectId, COMPANY), eq(event.type, 'company.unblocked')))

    const results = await runLegalChecks(COMPANY, SIRET)
    expect(results.map((r) => r.source).sort()).toEqual(['bodacc', 'sirene'])

    const checks = await db.select().from(legalCheck).where(eq(legalCheck.companyId, COMPANY))
    expect(checks.length).toBeGreaterThanOrEqual(2)
    // L'entreprise d'essai est active et sans avis bloquant.
    expect(checks.every((c) => c.status === 'active')).toBe(true)

    // Deuxieme passage a l'identique : aucun evenement de plus, sinon le
    // journal se noierait sous des constats quotidiens sans changement.
    await runLegalChecks(COMPANY, SIRET)
    const after = await db
      .select()
      .from(event)
      .where(and(eq(event.subjectId, COMPANY), eq(event.type, 'company.unblocked')))

    // Au plus une transition par source, quel que soit le nombre de passages.
    expect(after.length).toBeLessThanOrEqual(before.length + 2)
    expect(after.length).toBeGreaterThan(0)

    await connection.end()
  })
})
