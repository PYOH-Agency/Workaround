import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company } from '@/db/schema'
import { verificationView } from '@/services/verification-view'

/**
 * L'invariant du parcours : un inscrit sans couverture et un inconnu voient
 * exactement la meme page.
 *
 * Ce test PASSE des son ecriture, et ce n'est pas un defaut : `verificationView`
 * ne consulte jamais la table `company`, donc l'invariant tient deja. Il n'est
 * pas la pour reveler un bug, il est la pour ECHOUER le jour ou quelqu'un
 * ajoutera une phrase plus douce pour les inscrits — « vous etes deja des
 * notres », « cette entreprise nous connait », un ton adouci, un bloc de moins.
 * Ce jour-la, ce n'est pas le test qu'il faut corriger : la page de verification
 * viendrait de devenir un test d'appartenance a D'equerre, lisible par n'importe
 * quel tiers avec un SIRET.
 *
 * Ne le supprimez pas en le croyant tautologique. Sa valeur est entierement dans
 * l'avenir qu'il interdit.
 *
 * Les SIRET sont propres a ce fichier : la base est partagee ET vitest execute
 * les fichiers en parallele. Reprendre ceux d'un autre fichier ferait que son
 * nettoyage efface notre entreprise en plein milieu du test.
 */
// Cles de Luhn justes, absents du seed et de tout autre fichier de test.
const MEMBER_SIRET = '61345670000004'
const STRANGER_SIRET = '62883110000001'

const NOW = new Date('2026-08-19T12:00:00Z')

function stub(siret: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        String(url).includes('bodacc')
          ? { results: [] }
          : {
              results: [
                {
                  nom_complet: 'MAISON DUPONT',
                  nature_juridique: '5499',
                  date_creation: '2015-04-01',
                  matching_etablissements: [
                    {
                      siret,
                      adresse: '3 RUE DES LILAS 69003 LYON',
                      code_postal: '69003',
                      libelle_commune: 'LYON',
                      etat_administratif: 'A',
                      liste_rge: null,
                    },
                  ],
                },
              ],
            },
    })),
  )
}

beforeAll(async () => {
  // La base n'est pas reinitialisee entre deux passages : on efface nos propres
  // traces AVANT d'ecrire, sinon le second passage bute sur l'unicite du SIRET.
  await db.delete(company).where(inArray(company.siret, [MEMBER_SIRET, STRANGER_SIRET]))

  await db.insert(company).values({
    id: randomUUID(),
    siret: MEMBER_SIRET,
    legalName: 'INSCRIT SANS COUVERTURE',
  })
})

afterEach(() => vi.unstubAllGlobals())
afterAll(async () => {
  await connection.end()
})

describe('l invariant d indistinction', () => {
  it('rend exactement la meme vue pour un inscrit sans couverture et pour un inconnu', async () => {
    // Le cas B existe bien en base : sans cette garde, un `beforeAll` casse
    // ferait comparer deux inconnus, et le test passerait a vide.
    const rows = await db.select().from(company).where(eq(company.siret, MEMBER_SIRET))
    expect(rows).toHaveLength(1)

    stub(MEMBER_SIRET)
    const member = await verificationView(MEMBER_SIRET, NOW)

    vi.unstubAllGlobals()
    stub(STRANGER_SIRET)
    const stranger = await verificationView(STRANGER_SIRET, NOW)

    // Hors identite — c'est-a-dire hors ce que les registres publics disent de
    // chacun —, les deux vues sont indiscernables.
    expect({ ...member, siret: '', identity: null }).toEqual({
      ...stranger,
      siret: '',
      identity: null,
    })
  })

  it('ne laisse fuir l appartenance dans AUCUN champ, meme serialise', async () => {
    // Deuxieme filet : un champ ajoute plus tard — `isMember`, `knownToUs`, un
    // libelle repris de `company.legalName` — passerait l'egalite ci-dessus si
    // on le rangeait dans `identity`. La raison sociale inscrite en base ne doit
    // apparaitre nulle part : la page ne connait que le repertoire public.
    stub(MEMBER_SIRET)
    const member = await verificationView(MEMBER_SIRET, NOW)

    const serialized = JSON.stringify(member)
    expect(serialized).not.toMatch(/INSCRIT SANS COUVERTURE/i)
    expect(serialized).not.toMatch(/equerre|membre|inscrit|adherent/i)
  })
})
