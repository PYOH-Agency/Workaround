import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { connection, db } from '@/db/client'
import { event } from '@/db/schema'
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

/**
 * La mesure de la spec §7 : sans elle, la carte d'accueil ne se juge pas.
 *
 * Le seuil est ecrit d'avance pour qu'il ne se renegocie pas apres — si a deux
 * mois moins d'un artisan sur trois a ouvert son passeport, le tutoriel ecarte
 * en §2.1 redevient une question ouverte.
 */
describe('le rejet se compte', () => {
  const factsFor = (userId: string) =>
    db
      .select()
      .from(event)
      .where(and(eq(event.subjectId, userId), eq(event.type, 'note.dismissed')))

  it('inscrit un fait au journal', async () => {
    const userId = someone()
    await dismissNote(userId, 'mon-passeport')

    const [fact] = await factsFor(userId)
    expect(fact).toBeDefined()
    expect(fact.actorId).toBe(userId)
  })

  it('ne met QUE la cle en charge utile', async () => {
    // Le journal est ineffacable par declencheur : y ecrire une adresse ou un
    // nom rendrait le droit a l'effacement structurellement impossible a
    // honorer. La cle d'ecran suffit, et l'identifiant est deja dans
    // `actor_id`.
    const userId = someone()
    await dismissNote(userId, 'verification')

    const [fact] = await factsFor(userId)
    expect(fact.payload).toEqual({ key: 'verification' })
  })

  it('range le demandeur du cote des clients', async () => {
    // `actorType` se deduit du public de la notice : le service ne sait rien
    // d'autre de la personne, et le catalogue le sait deja.
    const artisan = someone()
    const demandeur = someone()
    await dismissNote(artisan, 'devis')
    await dismissNote(demandeur, 'mes-logements')

    expect((await factsFor(artisan))[0].actorType).toBe('company')
    expect((await factsFor(demandeur))[0].actorType).toBe('customer')
  })

  it('ne compte pas deux fois la meme carte', async () => {
    // Le seuil se lit en parts de personnes, pas en clics : deux onglets ou un
    // reseau lent gonfleraient le compte sans qu'une carte de plus ait ete lue.
    const userId = someone()
    await dismissNote(userId, 'agenda')
    await dismissNote(userId, 'agenda')

    expect(await factsFor(userId)).toHaveLength(1)
  })
})
