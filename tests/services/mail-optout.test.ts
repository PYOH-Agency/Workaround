import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { inArray, sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { mailOptout } from '@/db/schema'
import { recordOptout } from '@/services/attestation-request'
import { optoutToken } from '@/domain/mail-optout'

/**
 * Adresses propres a ce fichier : la base est partagee et vitest fait tourner
 * les fichiers en parallele. Aucune assertion ne porte sur un total — toujours
 * filtree par ces adresses.
 */
const ARTISAN = 'artisan@stop-test.fr'
const AUTRE = 'autre@stop-test.fr'
const OURS = [ARTISAN, AUTRE]

const SECRET = 'secret-local-opposition'

function ourRows() {
  return db.select().from(mailOptout).where(inArray(sql`lower(${mailOptout.email})`, OURS))
}

beforeEach(async () => {
  await db.delete(mailOptout).where(inArray(sql`lower(${mailOptout.email})`, OURS))
})

afterAll(async () => connection.end())

describe('recordOptout', () => {
  it('enregistre l opposition avec un jeton valide', async () => {
    const token = optoutToken(ARTISAN, SECRET)
    const result = await recordOptout(ARTISAN, token, SECRET)

    expect(result).toBe(true)
    const rows = await ourRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe(ARTISAN)
  })

  it('n ecrit rien avec un jeton invalide', async () => {
    const result = await recordOptout(ARTISAN, 'jeton-invente', SECRET)

    expect(result).toBe(false)
    expect(await ourRows()).toHaveLength(0)
  })

  /**
   * Un lien de mail est clique deux fois, transfere, rouvert des mois plus
   * tard. Une erreur au second essai laisserait croire que l'opposition n'a
   * pas ete prise en compte.
   */
  it('est idempotent : deux clics ne creent ni deux lignes ni une erreur', async () => {
    const token = optoutToken(ARTISAN, SECRET)

    const first = await recordOptout(ARTISAN, token, SECRET)
    const second = await recordOptout(ARTISAN, token, SECRET)

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(await ourRows()).toHaveLength(1)
  })

  /**
   * L'invariant que le schema annonce sur `mailOptout.email` : une opposition
   * enregistree dans une casse doit bloquer un envoi dans une autre. Sans ce
   * test, la normalisation ne repose sur rien.
   */
  it('normalise l adresse : une opposition en majuscules bloque la forme minuscule', async () => {
    const mixedCase = 'Artisan@Stop-Test.FR'
    const token = optoutToken(mixedCase, SECRET)

    const result = await recordOptout(mixedCase, token, SECRET)

    expect(result).toBe(true)
    const rows = await ourRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe(ARTISAN)
  })

  it('accepte un jeton recopie dans une autre casse, meme adresse', async () => {
    const token = optoutToken(ARTISAN, SECRET)

    const result = await recordOptout(ARTISAN, token.toUpperCase(), SECRET)

    expect(result).toBe(true)
    expect(await ourRows()).toHaveLength(1)
  })

  it('n ecrit rien si l adresse est absente', async () => {
    const token = optoutToken(ARTISAN, SECRET)

    const result = await recordOptout(undefined, token, SECRET)

    expect(result).toBe(false)
    expect(await ourRows()).toHaveLength(0)
  })

  it('n ecrit rien si le jeton est absent', async () => {
    const result = await recordOptout(ARTISAN, undefined, SECRET)

    expect(result).toBe(false)
    expect(await ourRows()).toHaveLength(0)
  })

  it('n ecrit rien si le secret est vide', async () => {
    const token = optoutToken(ARTISAN, SECRET)

    const result = await recordOptout(ARTISAN, token, '')

    expect(result).toBe(false)
    expect(await ourRows()).toHaveLength(0)
  })

  it('rejette un jeton signe pour une autre adresse', async () => {
    const token = optoutToken(AUTRE, SECRET)

    const result = await recordOptout(ARTISAN, token, SECRET)

    expect(result).toBe(false)
    expect(await ourRows()).toHaveLength(0)
  })
})
