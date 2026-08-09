import { describe, it, expect, afterAll } from 'vitest'
import { connection } from '@/db/client'
import { saveStatement, statementFor } from '@/services/statements'
import { MAX_STATEMENT_LENGTH } from '@/domain/dispute'
import { companyMetrics } from '@/services/passport-metrics'
import { lateChantier } from './dispute-fixtures'

afterAll(async () => {
  await connection.end()
})

describe('la declaration complementaire', () => {
  it('s attache au chantier', async () => {
    const { companyId, quoteId } = await lateChantier()
    await saveStatement(companyId, quoteId, 'Retard imputable à l’indisponibilité du client.')

    expect((await statementFor(quoteId))?.body).toContain('indisponibilité')
  })

  it('se reecrit', async () => {
    const { companyId, quoteId } = await lateChantier()
    await saveStatement(companyId, quoteId, 'Première version.')
    await saveStatement(companyId, quoteId, 'Seconde version.')

    expect((await statementFor(quoteId))?.body).toBe('Seconde version.')
  })

  it('ne change AUCUN chiffre', async () => {
    // C'est ce qui la distingue de la contestation, et ce qui concilie « le
    // passeport est derive et non editable » avec le droit de rectification.
    const { companyId, quoteId } = await lateChantier()
    const now = new Date()
    const before = await companyMetrics(companyId, now)

    await saveStatement(companyId, quoteId, 'Le client était absent.')

    expect(await companyMetrics(companyId, now)).toEqual(before)
  })

  it('refuse une declaration vide', async () => {
    const { companyId, quoteId } = await lateChantier()
    await expect(saveStatement(companyId, quoteId, '   ')).rejects.toThrow(/vide/)
  })

  it('refuse une declaration trop longue', async () => {
    const { companyId, quoteId } = await lateChantier()
    await expect(
      saveStatement(companyId, quoteId, 'a'.repeat(MAX_STATEMENT_LENGTH + 1)),
    ).rejects.toThrow(/trop longue/)
  })

  it('refuse le chantier d une autre entreprise', async () => {
    const { quoteId } = await lateChantier()
    const other = await lateChantier()

    await expect(saveStatement(other.companyId, quoteId, 'Texte.')).rejects.toThrow(/introuvable/)
  })
})
