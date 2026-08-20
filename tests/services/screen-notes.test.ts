import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { connection } from '@/db/client'
import { dismissNote, dismissedNotes, reopenNotes } from '@/services/screen-notes'

afterAll(async () => {
  await connection.end()
})

/** Un identifiant d'`auth.users` : la table n'a aucune cle etrangere vers lui. */
const someone = () => randomUUID()

describe('les notices refermees', () => {
  it('ne referme rien tant que personne n a rien ferme', async () => {
    expect(await dismissedNotes(someone())).toEqual(new Set())
  })

  it('retient la notice qu on vient de fermer', async () => {
    const userId = someone()
    await dismissNote(userId, 'devis')

    expect(await dismissedNotes(userId)).toEqual(new Set(['devis']))
  })

  it('supporte deux fois le meme geste', async () => {
    // Deux clics, ou deux onglets : le second ne doit pas remonter une
    // violation de cle primaire jusqu a l ecran.
    const userId = someone()
    await dismissNote(userId, 'agenda')
    await dismissNote(userId, 'agenda')

    expect(await dismissedNotes(userId)).toEqual(new Set(['agenda']))
  })

  it('ne ferme que ce qu on lui demande', async () => {
    const userId = someone()
    await dismissNote(userId, 'agenda')

    expect((await dismissedNotes(userId)).has('devis')).toBe(false)
  })

  it('ne montre pas a l un ce que l autre a ferme', async () => {
    const paul = someone()
    const marie = someone()
    await dismissNote(paul, 'mon-passeport')

    expect(await dismissedNotes(marie)).toEqual(new Set())
  })

  it('rouvre toutes les notices d une personne', async () => {
    const userId = someone()
    await dismissNote(userId, 'devis')
    await dismissNote(userId, 'verification')

    await reopenNotes(userId)

    expect(await dismissedNotes(userId)).toEqual(new Set())
  })

  it('ne rouvre QUE celles de cette personne', async () => {
    // La suppression est portee par la requete, filtree sur `user_id` : un
    // oubli rouvrirait les notices de tout le monde, et personne ne le verrait
    // depuis son propre compte.
    const paul = someone()
    const marie = someone()
    await dismissNote(paul, 'devis')
    await dismissNote(marie, 'devis')
    await dismissNote(marie, 'mes-logements')

    await reopenNotes(paul)

    expect(await dismissedNotes(marie)).toEqual(new Set(['devis', 'mes-logements']))
  })
})
