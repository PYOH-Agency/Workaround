import { describe, it, expect } from 'vitest'
import { rechercherEtablissement } from '@/services/entreprise-publique'

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
    const r = await rechercherEtablissement('50769820700036')

    expect(r.siret).toBe('50769820700036')
    expect(r.raisonSociale).toContain('BD PLOMBERIE')
    expect(r.codePostal).toBe('33530')
    expect(r.ville).toBe('BASSENS')
    expect(r.adresseLigne1).not.toContain('33530')
    expect(r.actif).toBe(true)
    expect(typeof r.rge).toBe('boolean')
  })

  it('recupere un entrepreneur individuel, dont la raison sociale est nulle en base', async () => {
    const r = await rechercherEtablissement('10007588600018')

    expect(r.siret).toBe('10007588600018')
    expect(r.raisonSociale.length).toBeGreaterThan(0)
    expect(r.formeJuridique).toBe('1000')
  })

  it('rejette un SIRET inexistant', async () => {
    await expect(rechercherEtablissement('00000000000000')).rejects.toThrow()
  })
})
