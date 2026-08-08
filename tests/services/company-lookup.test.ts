import { describe, it, expect, vi, afterEach } from 'vitest'
import { findEstablishment } from '@/services/company-lookup'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Societe : nom_raison_sociale renseigne. */
const COMPANY = {
  results: [
    {
      siren: '507698207',
      nom_complet: 'BD PLOMBERIE (BD PLOMBERIE)',
      nom_raison_sociale: 'BD PLOMBERIE',
      nature_juridique: '5710',
      tva: ['FR51507698207'],
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
const SOLE_TRADER = {
  results: [
    {
      siren: '100075886',
      nom_complet: 'FABRICE CASSOU (FCMI PLOMBERIE)',
      nom_raison_sociale: null,
      nature_juridique: '1000',
      // L'API ne publie pas de TVA pour un entrepreneur individuel.
      tva: null,
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

describe('findEstablishment', () => {
  it('refuse un SIRET invalide sans appeler le reseau', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await expect(findEstablishment('123')).rejects.toThrow('SIRET invalide')
    expect(spy).not.toHaveBeenCalled()
  })

  it('mappe une societe', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(COMPANY))

    expect(await findEstablishment('507 698 207 00036')).toEqual({
      siret: '50769820700036',
      legalName: 'BD PLOMBERIE (BD PLOMBERIE)',
      legalForm: '5710',
      legalFormLabel: 'SAS',
      vatNumber: 'FR51507698207',
      foundedOn: new Date('2008-09-01'),
      active: true,
      addressLine1: '43 RUE SIMONE SIGNORET',
      postalCode: '33530',
      city: 'BASSENS',
      rge: true,
    })
  })

  it('mappe un entrepreneur individuel, dont la raison sociale est nulle', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(SOLE_TRADER))

    const found = await findEstablishment('10007588600018')

    // Le nom vient de nom_complet : c'est la forme dominante du metier, et
    // lire nom_raison_sociale produirait une raison sociale vide.
    expect(found.legalName).toBe('FABRICE CASSOU (FCMI PLOMBERIE)')
    expect(found.legalForm).toBe('1000')
    expect(found.legalFormLabel).toBe('Entreprise individuelle')
    // Calcule depuis le SIREN, faute d'etre publie.
    expect(found.vatNumber).toBe('FR60100075886')
    expect(found.addressLine1).toBe('627 AVENUE DU MARECHAL DE LATTRE DE TASSIGNY')
    expect(found.rge).toBe(false)
  })

  it('interroge l API avec minimal=true et matching_etablissements', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(COMPANY))

    await findEstablishment('50769820700036')

    const url = String(spy.mock.calls[0][0])
    expect(url).toContain('q=50769820700036')
    expect(url).toContain('minimal=true')
    expect(url).toContain('matching_etablissements')
    // `minimal=true` elague `tva` : il faut le demander explicitement.
    expect(url).toContain('tva')
  })

  it('rejette une reponse dont le SIRET ne correspond pas a la demande', async () => {
    // La recherche est plein texte, donc floue.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(COMPANY))
    await expect(findEstablishment('50769820700028')).rejects.toThrow('introuvable')
  })

  it('signale une entreprise introuvable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ results: [] }))
    await expect(findEstablishment('50769820700036')).rejects.toThrow('introuvable')
  })

  it('signale une panne de l API sans la confondre avec une absence de resultat', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 503))
    await expect(findEstablishment('50769820700036')).rejects.toThrow('indisponible')
  })

  it('detecte un etablissement ferme', async () => {
    const closed = structuredClone(COMPANY)
    closed.results[0].matching_etablissements[0].etat_administratif = 'F'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(closed))

    expect((await findEstablishment('50769820700036')).active).toBe(false)
  })
})
