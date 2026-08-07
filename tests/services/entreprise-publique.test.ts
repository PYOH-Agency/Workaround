import { describe, it, expect, vi, afterEach } from 'vitest'
import { rechercherEtablissement } from '@/services/entreprise-publique'

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } })

/** Societe : nom_raison_sociale renseigne. */
const SOCIETE = {
  results: [
    {
      siren: '507698207',
      nom_complet: 'BD PLOMBERIE (BD PLOMBERIE)',
      nom_raison_sociale: 'BD PLOMBERIE',
      nature_juridique: '5710',
      date_creation: '2008-09-01',
      complements: { est_rge: true, est_entrepreneur_individuel: false },
      matching_etablissements: [
        {
          siret: '50769820700036',
          adresse: '43 RUE SIMONE SIGNORET 33530 BASSENS',
          code_postal: '33530',
          libelle_commune: 'BASSENS',
          etat_administratif: 'A',
          liste_rge: ['E-E123456'],
        },
      ],
    },
  ],
}

/** Entrepreneur individuel : nom_raison_sociale nul, le nom est dans nom_complet. */
const ENTREPRENEUR_INDIVIDUEL = {
  results: [
    {
      siren: '100075886',
      nom_complet: 'FABRICE CASSOU (FCMI PLOMBERIE)',
      nom_raison_sociale: null,
      nature_juridique: '1000',
      date_creation: '2021-03-15',
      complements: { est_rge: false, est_entrepreneur_individuel: true },
      matching_etablissements: [
        {
          siret: '10007588600018',
          adresse: '627 AVENUE DU MARECHAL DE LATTRE DE TASSIGNY 33200 BORDEAUX',
          code_postal: '33200',
          libelle_commune: 'BORDEAUX',
          etat_administratif: 'A',
          liste_rge: null,
        },
      ],
    },
  ],
}

afterEach(() => vi.restoreAllMocks())

describe('rechercherEtablissement', () => {
  it('refuse un SIRET invalide sans appeler le reseau', async () => {
    const espion = vi.spyOn(globalThis, 'fetch')
    await expect(rechercherEtablissement('123')).rejects.toThrow('SIRET invalide')
    expect(espion).not.toHaveBeenCalled()
  })

  it('mappe une societe', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(SOCIETE))

    const r = await rechercherEtablissement('507 698 207 00036')

    expect(r).toEqual({
      siret: '50769820700036',
      raisonSociale: 'BD PLOMBERIE (BD PLOMBERIE)',
      formeJuridique: '5710',
      dateCreation: new Date('2008-09-01'),
      actif: true,
      adresseLigne1: '43 RUE SIMONE SIGNORET',
      codePostal: '33530',
      ville: 'BASSENS',
      rge: true,
    })
  })

  it('mappe un entrepreneur individuel, dont la raison sociale est nulle', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(ENTREPRENEUR_INDIVIDUEL))

    const r = await rechercherEtablissement('10007588600018')

    // Le nom vient de nom_complet : c'est la forme dominante du metier, et
    // lire nom_raison_sociale produirait une raison sociale vide.
    expect(r.raisonSociale).toBe('FABRICE CASSOU (FCMI PLOMBERIE)')
    expect(r.formeJuridique).toBe('1000')
    expect(r.adresseLigne1).toBe('627 AVENUE DU MARECHAL DE LATTRE DE TASSIGNY')
    expect(r.rge).toBe(false)
  })

  it('interroge l API avec minimal=true et matching_etablissements', async () => {
    const espion = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(SOCIETE))

    await rechercherEtablissement('50769820700036')

    const url = String(espion.mock.calls[0][0])
    expect(url).toContain('q=50769820700036')
    expect(url).toContain('minimal=true')
    expect(url).toContain('matching_etablissements')
  })

  it('rejette une reponse dont le SIRET ne correspond pas a la demande', async () => {
    // La recherche est floue : elle peut renvoyer un autre etablissement.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(SOCIETE))

    await expect(rechercherEtablissement('50769820700028')).rejects.toThrow('introuvable')
  })

  it('signale une entreprise introuvable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({ results: [] }))
    await expect(rechercherEtablissement('50769820700036')).rejects.toThrow('introuvable')
  })

  it('signale une panne de l API sans la confondre avec une absence de resultat', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({}, 503))
    await expect(rechercherEtablissement('50769820700036')).rejects.toThrow('indisponible')
  })

  it('detecte un etablissement ferme', async () => {
    const ferme = structuredClone(SOCIETE)
    ferme.results[0].matching_etablissements[0].etat_administratif = 'F'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(ferme))

    const r = await rechercherEtablissement('50769820700036')
    expect(r.actif).toBe(false)
  })
})
