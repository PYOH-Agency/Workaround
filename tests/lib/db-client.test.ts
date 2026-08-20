import { describe, it, expect, afterEach } from 'vitest'

/**
 * Le garde de `DATABASE_URL`, et le moment ou il tombe.
 *
 * Deux proprietes valent d'etre tenues ensemble, et elles se sont contredites
 * une fois : le refus doit NOMMER la variable, et il ne doit PAS empecher le
 * build. Une premiere version lisait l'adresse au chargement du module, ce qui
 * faisait echouer `next build` — plus rien ne se construisait, pas meme les
 * ecrans statiques que la previsualisation sert a relire.
 *
 * Ce fichier n'importe `@/db/client` qu'a l'interieur des tests : un import de
 * tete amorcerait la connexion avec l'adresse de `.env.test`, et il n'y aurait
 * plus rien a observer.
 */
const REAL = process.env.DATABASE_URL

afterEach(() => {
  process.env.DATABASE_URL = REAL
})

describe('le client de base', () => {
  it("s'importe sans adresse, pour que le build survive", async () => {
    delete process.env.DATABASE_URL

    // L'import seul ne doit rien tenter : c'est ce qui laisse `next build`
    // produire les ecrans qui n'ont besoin d'aucune base.
    await expect(import('@/db/client')).resolves.toBeDefined()
  })

  it("refuse au premier usage, en nommant ce qui manque", async () => {
    delete process.env.DATABASE_URL
    const { db } = await import('@/db/client')

    // `postgres(undefined)` ne levait pas : le deploiement sortait vert et
    // rendait « Internal Server Error » sans dire pourquoi.
    expect(() => db.select()).toThrow('DATABASE_URL est absente')
  })
})
