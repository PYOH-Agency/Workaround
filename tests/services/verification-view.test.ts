import { describe, it, expect, vi, afterEach } from 'vitest'
import { verificationView } from '@/services/verification-view'

const SIRET = '50769820700036'
const NOW = new Date('2026-08-19T12:00:00Z')

const ESTABLISHMENT = {
  results: [
    {
      nom_complet: 'MAISON DUPONT',
      nature_juridique: '5499',
      date_creation: '2015-04-01',
      matching_etablissements: [
        {
          siret: SIRET,
          adresse: '3 RUE DES LILAS 69003 LYON',
          code_postal: '69003',
          libelle_commune: 'LYON',
          etat_administratif: 'A',
          liste_rge: null as string[] | null,
        },
      ],
    },
  ],
}

function stubFetch(handler: (url: string) => unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = handler(String(url))
      if (body === null) return { ok: false, status: 503 }
      return { ok: true, json: async () => body }
    }),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('verificationView', () => {
  it('rend l identite et aucune alerte quand tout va bien', async () => {
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : ESTABLISHMENT))

    const view = await verificationView(SIRET, NOW)

    expect(view.identity).toMatchObject({ legalName: 'MAISON DUPONT', city: 'LYON' })
    expect(view.alerts).toEqual([])
    expect(view.registryUnavailable).toBe(false)
    expect(view.unknownSiret).toBe(false)
  })

  it('distingue une entreprise absente du repertoire d une panne', async () => {
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : { results: [] }))

    const view = await verificationView(SIRET, NOW)

    expect(view.unknownSiret).toBe(true)
    expect(view.registryUnavailable).toBe(false)
  })

  it('signale une panne du repertoire sans inventer une identite', async () => {
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : null))

    const view = await verificationView(SIRET, NOW)

    expect(view.registryUnavailable).toBe(true)
    expect(view.unknownSiret).toBe(false)
    expect(view.identity).toBeNull()
  })

  it('remonte la cessation d activite en alerte', async () => {
    const closed = structuredClone(ESTABLISHMENT)
    closed.results[0].matching_etablissements[0].etat_administratif = 'F'
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : closed))

    const view = await verificationView(SIRET, NOW)

    expect(view.alerts).toHaveLength(1)
    expect(view.alerts[0].kind).toBe('closed')
  })

  it('remonte une procedure collective, pas une conciliation', async () => {
    stubFetch((url) =>
      url.includes('bodacc')
        ? { results: [{ familleavis: 'collective' }, { familleavis: 'conciliation' }] }
        : ESTABLISHMENT,
    )

    const view = await verificationView(SIRET, NOW)

    const kinds = view.alerts.map((a) => a.kind)
    expect(kinds).toContain('proceeding')
    expect(view.alerts).toHaveLength(1)
  })

  it('ne produit aucune alerte pour une conciliation seule', async () => {
    // Le test precedent ne suffit pas : `collective` y masque `conciliation`,
    // et une seule alerte sort quoi qu'il arrive. Il faut la conciliation
    // SEULE pour verrouiller le fait qu'une demarche volontaire de prevention
    // ne se lit pas comme une liquidation.
    stubFetch((url) =>
      url.includes('bodacc') ? { results: [{ familleavis: 'conciliation' }] } : ESTABLISHMENT,
    )

    const view = await verificationView(SIRET, NOW)

    expect(view.alerts).toEqual([])
    expect(view.alertsUnavailable).toBe(false)
  })

  it('n affiche AUCUNE alerte quand le BODACC ne repond pas, et le dit', async () => {
    // Une liste vide se lirait « aucune procedure » : ce serait blanchir une
    // entreprise en liquidation parce qu'une API n'a pas repondu.
    stubFetch((url) => (url.includes('bodacc') ? null : ESTABLISHMENT))

    const view = await verificationView(SIRET, NOW)

    expect(view.alerts).toEqual([])
    expect(view.alertsUnavailable).toBe(true)
  })

  it('ne laisse fuir AUCUN signal positif, meme pour une entreprise active et RGE', async () => {
    // Le cas le plus tentant : etablissement actif, plusieurs qualifications
    // RGE, TVA calculable, adresse complete. Rien de tout cela n'a le droit de
    // sortir : trois coches vertes suivies d'un silence sur la decennale
    // reproduiraient le piege que `/verifier` denonce.
    const rge = structuredClone(ESTABLISHMENT)
    rge.results[0].matching_etablissements[0].liste_rge = ['E-E123456', 'QB/12345']
    rge.results[0].matching_etablissements[0].etat_administratif = 'A'
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : rge))

    const view = await verificationView(SIRET, NOW)

    // Egalite exacte sur la vue ENTIERE : tout champ ajoute un jour — `rge`,
    // `active`, `score`, `vatNumber` — fait echouer ce test, y compris s'il
    // vaut `false`. C'est le seul verrou qui tienne face a un ajout futur.
    expect(view).toEqual({
      siret: SIRET,
      identity: {
        legalName: 'MAISON DUPONT',
        legalFormLabel: 'SARL',
        city: 'LYON',
        foundedOn: new Date('2015-04-01'),
      },
      unknownSiret: false,
      registryUnavailable: false,
      alerts: [],
      alertsUnavailable: false,
    })

    // Deuxieme filet, sur les VALEURS cette fois : un champ renomme
    // (`qualifications`, `labels`…) passerait l'egalite ci-dessus s'il etait
    // ajoute au modele attendu par distraction, pas cette recherche.
    const serialized = JSON.stringify(view)
    expect(serialized).not.toMatch(/rge|E-E123456|QB\/12345/i)
    expect(serialized).not.toMatch(/actif|active/i)
  })

  it('reste servable quand les deux sources tombent ensemble', async () => {
    // Le verdict de couverture ne vient pas de l'open data mais de notre base :
    // la page doit s'afficher meme si tout le reste est muet.
    stubFetch(() => null)

    const view = await verificationView(SIRET, NOW)

    expect(view.identity).toBeNull()
    expect(view.alerts).toEqual([])
    expect(view.registryUnavailable).toBe(true)
    expect(view.alertsUnavailable).toBe(true)
    expect(view.unknownSiret).toBe(false)
  })
})
