import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, verificationLookup } from '@/db/schema'
import { lookupCompany } from '@/actions/public'

/**
 * Les trois cas du parcours, vus depuis l'action.
 *
 * Les SIRET sont propres a ce fichier : la base est partagee ET les fichiers de
 * test tournent en parallele. Reprendre ceux de `verification-lookup.test.ts`
 * ferait que le `beforeAll` de l'un efface l'entreprise de l'autre en plein
 * milieu d'un test — l'inscrit sans couverture ressortirait `stranger`.
 */
const MEMBER = randomUUID()
// Cles de Luhn justes, SIREN absents du seed et d'aucun autre fichier de test.
const MEMBER_SIRET = '51892543000002'
const STRANGER_SIRET = '66012345600007'
// BD PLOMBERIE, seule entreprise du seed a couverture publiee.
const COVERED_SIRET = '50769820700036'
const MALFORMED = '123'

beforeAll(async () => {
  // La base n'est pas reinitialisee entre deux passages : on efface nos propres
  // traces AVANT d'ecrire, sinon le second passage lit celles du premier.
  await db
    .delete(verificationLookup)
    .where(inArray(verificationLookup.siret, [MEMBER_SIRET, STRANGER_SIRET, COVERED_SIRET, MALFORMED]))
  await db.delete(company).where(eq(company.siret, MEMBER_SIRET))

  await db.insert(company).values({
    id: MEMBER,
    siret: MEMBER_SIRET,
    legalName: 'INSCRIT SANS COUVERTURE',
  })
})

afterAll(async () => {
  await connection.end()
})

function form(siret: string, entry: string): FormData {
  const data = new FormData()
  data.set('siret', siret)
  data.set('entry', entry)
  return data
}

/** `redirect` leve : c'est le mecanisme normal de Next, pas une panne. */
async function redirectTarget(siret: string, entry: string): Promise<string> {
  const thrown = await lookupCompany({}, form(siret, entry)).catch((e) => e)
  // Sans cette garde, une action qui REND un etat au lieu de rediriger donnerait
  // deux fois `[object Object]` — et le test de l'invariant passerait a vide.
  expect(typeof thrown?.digest, `pas de redirection pour ${siret}`).toBe('string')
  return String(thrown.digest)
}

async function lastLookup(siret: string) {
  const rows = await db.select().from(verificationLookup).where(eq(verificationLookup.siret, siret))
  return rows.at(-1)
}

describe('lookupCompany', () => {
  it('refuse un SIRET mal forme sans rien journaliser', async () => {
    const state = await lookupCompany({}, form(MALFORMED, 'demandeur'))

    expect(state.error).toContain('incomplet')
    // Compte sur NOS seuls SIRET : un autre fichier ecrit en parallele dans la
    // meme table, un total global serait une source de faux echecs.
    expect(await lastLookup(MALFORMED)).toBeUndefined()
  })

  it('redirige un inconnu vers la page de verification et journalise', async () => {
    const target = await redirectTarget(STRANGER_SIRET, 'demandeur')
    expect(target).toContain(`/verification/${STRANGER_SIRET}`)

    const row = await lastLookup(STRANGER_SIRET)
    expect(row?.outcome).toBe('stranger')
    expect(row?.entry).toBe('demandeur')
  })

  /**
   * Sans ce test, une inversion de la condition enverrait tous les artisans
   * couverts vers la page d'absence — le produit annoncerait le contraire de ce
   * qu'il sait.
   */
  it('mene une entreprise couverte a son passeport', async () => {
    const target = await redirectTarget(COVERED_SIRET, 'pro')
    expect(target).toContain('/artisan/')
    expect(target).not.toContain('/verification/')

    const row = await lastLookup(COVERED_SIRET)
    expect(row?.outcome).toBe('covered')
    expect(row?.entry).toBe('pro')
  })

  /**
   * L'invariant du parcours.
   *
   * Un inscrit sans couverture et un inconnu recoivent la MEME page. La
   * distinction existe cote serveur — elle choisit le corps du mail envoye a
   * l'artisan — et nulle part ailleurs : si les deux cibles divergeaient, le
   * formulaire deviendrait un test d'appartenance a D'equerre.
   */
  it('ne distingue pas un inscrit sans couverture d’un inconnu', async () => {
    const member = await redirectTarget(MEMBER_SIRET, 'demandeur')
    const stranger = await redirectTarget(STRANGER_SIRET, 'demandeur')

    // Seul le SIRET separe les deux cibles.
    expect(member.replace(MEMBER_SIRET, '<siret>')).toBe(stranger.replace(STRANGER_SIRET, '<siret>'))
    expect(member).toContain(`/verification/${MEMBER_SIRET}`)

    // Le journal, lui, sait la difference : c'est la part legitime.
    expect((await lastLookup(MEMBER_SIRET))?.outcome).toBe('uncovered_member')
    expect((await lastLookup(STRANGER_SIRET))?.outcome).toBe('stranger')
  })
})
