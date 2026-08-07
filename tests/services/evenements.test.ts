import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connexion } from '@/db/client'
import { evenement } from '@/db/schema'
import { enregistrerEvenement } from '@/services/evenements'

/**
 * Ces tests n'effacent rien.
 *
 * Le plan initial desactivait le declencheur d'immuabilite pour nettoyer entre
 * deux executions. C'etait percer la garantie qu'on vient d'etablir pour la
 * seule commodite d'un test. On isole par identifiant unique a la place, et
 * `pnpm test` remet la base a zero avant la suite.
 */
afterAll(async () => {
  await connexion.end()
})

describe('enregistrerEvenement', () => {
  it('ecrit un evenement horodate', async () => {
    const sujetId = randomUUID()

    await enregistrerEvenement({
      type: 'devis.envoye',
      sujetType: 'devis',
      sujetId,
      acteurType: 'entreprise',
      payload: { totalTTC: 120000 },
    })

    const lignes = await db.select().from(evenement).where(eq(evenement.sujetId, sujetId))

    expect(lignes).toHaveLength(1)
    expect(lignes[0].type).toBe('devis.envoye')
    expect(lignes[0].payload).toEqual({ totalTTC: 120000 })
    expect(lignes[0].horodateLe).toBeInstanceOf(Date)
  })

  it('accepte un evenement minimal, sans entreprise ni acteur', async () => {
    const sujetId = randomUUID()

    await enregistrerEvenement({
      type: 'systeme.demarrage',
      sujetType: 'systeme',
      sujetId,
      acteurType: 'systeme',
    })

    const [ligne] = await db.select().from(evenement).where(eq(evenement.sujetId, sujetId))

    expect(ligne.entrepriseId).toBeNull()
    expect(ligne.acteurId).toBeNull()
    expect(ligne.payload).toEqual({})
  })

  it("refuse toute suppression, meme via la connexion de l'application", async () => {
    const sujetId = randomUUID()

    await enregistrerEvenement({
      type: 'devis.cree',
      sujetType: 'devis',
      sujetId,
      acteurType: 'entreprise',
    })

    // Drizzle enveloppe l'erreur SQL : on assere sur la cause, sinon le test
    // passerait au vert pour n'importe quel echec de requete.
    const erreur = await db
      .delete(evenement)
      .where(eq(evenement.sujetId, sujetId))
      .then(() => null)
      .catch((e: Error) => e)

    expect(erreur).toBeInstanceOf(Error)
    expect(String((erreur as Error).cause)).toContain('append-only')

    const restant = await db.select().from(evenement).where(eq(evenement.sujetId, sujetId))
    expect(restant).toHaveLength(1)
  })
})
