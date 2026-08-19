import { describe, expect, it, vi, afterEach } from 'vitest'
import { findEstablishment, CompanyNotFound } from '@/services/company-lookup'

const SIRET = '50769820700036'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('findEstablishment', () => {
  it('leve CompanyNotFound quand aucun etablissement ne correspond', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }),
    )
    await expect(findEstablishment(SIRET)).rejects.toBeInstanceOf(CompanyNotFound)
  })

  it('ne leve PAS CompanyNotFound quand le service est en panne', async () => {
    // La distinction porte tout l'affichage : « cette entreprise n'existe pas »
    // et « nous n'avons pas pu verifier » ne disent pas la meme chose au
    // demandeur, et l'une des deux serait un mensonge.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const error = await findEstablishment(SIRET).catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(CompanyNotFound)
  })

  it('leve avant tout appel reseau sur un SIRET invalide', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(findEstablishment('123')).rejects.toThrow('SIRET invalide')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ne leve PAS CompanyNotFound quand le reseau tombe', async () => {
    // Le try/catch de fetch produit une erreur generique : elle ne doit pas
    // etre confondue avec un constat d'absence au repertoire.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const error = await findEstablishment(SIRET).catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(CompanyNotFound)
  })

  it('leve CompanyNotFound quand le resultat ramene un voisin sans le bon SIRET', async () => {
    // La recherche est plein texte donc floue : un resultat non vide peut ne
    // porter aucun etablissement au SIRET exact demande. Sans ce filtre, on
    // afficherait l'identite d'une autre entreprise.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              nom_complet: 'Voisin SARL',
              nom_raison_sociale: 'Voisin',
              nature_juridique: '5499',
              date_creation: null,
              matching_etablissements: [{ siret: '99999999999999', adresse: null, code_postal: null, libelle_commune: null, etat_administratif: 'A', liste_rge: null }],
            },
          ],
        }),
      }),
    )
    await expect(findEstablishment(SIRET)).rejects.toBeInstanceOf(CompanyNotFound)
  })
})
