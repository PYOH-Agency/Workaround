import { describe, it, expect } from 'vitest'
import { findEstablishment } from '@/services/company-lookup'

/**
 * Test d'integration : appelle la vraie API.
 *
 * Exclu de `pnpm test` — il depend du reseau et d'un service tiers. Il existe
 * parce que les tests mockes ne prouvent que la coherence avec nos propres
 * fixtures : si la forme de la reponse change, seul cet appel le revele.
 *
 * A lancer avec `pnpm test:integration`.
 */
describe('API Recherche d Entreprises (reseau)', () => {
  it('recupere une societe reelle', async () => {
    const found = await findEstablishment('50769820700036')

    expect(found.siret).toBe('50769820700036')
    expect(found.legalName).toContain('BD PLOMBERIE')
    expect(found.postalCode).toBe('33530')
    expect(found.city).toBe('BASSENS')
    expect(found.addressLine1).not.toContain('33530')
    expect(found.active).toBe(true)
    expect(typeof found.rge).toBe('boolean')
    // Champs elagues par `minimal=true` s'ils ne sont pas demandes : le mock
    // les contenait, la vraie reponse non. Seul cet appel le revele.
    expect(found.vatNumber).toBe('FR51507698207')
    expect(found.legalFormLabel).toBe('SAS')
  })

  it('recupere un entrepreneur individuel, dont la raison sociale est nulle en base', async () => {
    const found = await findEstablishment('10007588600018')

    expect(found.siret).toBe('10007588600018')
    expect(found.legalName.length).toBeGreaterThan(0)
    expect(found.legalForm).toBe('1000')
    expect(found.legalFormLabel).toBe('Entreprise individuelle')
    // Non publie pour un entrepreneur individuel : calcule depuis le SIREN.
    expect(found.vatNumber).toBe('FR60100075886')
  })

  it('rejette un SIRET inexistant', async () => {
    await expect(findEstablishment('00000000000000')).rejects.toThrow()
  })
})
