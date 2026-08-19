import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { attestationRequest, event } from '@/db/schema'
import { advanceRequests } from '@/services/lead-advance'
import {
  CLAIRE,
  COMPANIES,
  COVERED,
  DEPOSITED,
  DOMAIN,
  NOW,
  OLD,
  RECENT,
  REGISTERED,
  UNKNOWN,
  openRequest,
  mine,
  reread,
  resetFixtures,
} from './lead-advance-fixtures'

const covered: string[] = []
const noAnswer: string[] = []

vi.mock('@/services/lead-mail', () => ({
  sendCoveragePublished: async (i: { to: string }) => {
    covered.push(i.to)
  },
  sendNoAnswer: async (i: { to: string }) => {
    noAnswer.push(i.to)
  },
}))
vi.mock('@/services/rge-lookup', () => ({ fetchRgeRows: async () => [] }))

beforeEach(async () => {
  covered.length = 0
  noAnswer.length = 0
  await resetFixtures()
})

afterAll(async () => connection.end())

describe('advanceRequests, l attribution figee', () => {
  it('fige l inscription des que l entreprise existe', async () => {
    const id = await openRequest(REGISTERED, RECENT)
    await advanceRequests(NOW)

    const row = await reread(id)
    expect(row.registeredAt).not.toBeNull()
    expect(row.companyId).toBe(COMPANIES[0])
    expect(row.depositedAt).toBeNull()
  })

  it('fige le depot quel que soit le statut de l attestation', async () => {
    const id = await openRequest(DEPOSITED, RECENT)
    await advanceRequests(NOW)

    // L'attestation attend sa relecture : elle n'est pas publiee, mais elle a
    // bien ete deposee. L'entonnoir doit voir cette marche-la.
    const row = await reread(id)
    expect(row.depositedAt).not.toBeNull()
    expect(row.coveredAt).toBeNull()
    expect(mine(covered)).toHaveLength(0)
  })

  it('ne fige rien, et n efface rien, quand le SIRET n est rattache a personne', async () => {
    const id = await openRequest(UNKNOWN, RECENT)
    await advanceRequests(NOW)

    const row = await reread(id)
    expect(row.registeredAt).toBeNull()
    expect(row.anonymizedAt).toBeNull()
  })

})

describe('advanceRequests, la couverture publiee', () => {
  /**
   * Le mail parti, les contacts n'ont plus de finalite : les garder trente
   * jours de plus serait conserver une donnee dont on n'a plus l'usage. La
   * passe previent et efface du meme geste.
   */
  it('previent le demandeur puis anonymise, sans attendre trente jours', async () => {
    const id = await openRequest(COVERED, RECENT)
    await advanceRequests(NOW)

    expect(mine(covered)).toEqual([CLAIRE])
    const row = await reread(id)
    expect(row.coveredAt).not.toBeNull()
    expect(row.coveredNotifiedAt).not.toBeNull()
    expect(row.anonymizedAt).not.toBeNull()
    expect(row.siret).toBeNull()
    expect(row.requesterEmail).toBeNull()
    // La garder rendrait le nom et le SIRET par une jointure : ce serait une
    // pseudonymisation qui dit son contraire.
    expect(row.companyId).toBeNull()
  })

  /**
   * La garde d'idempotence, sur la seule scene ou elle peut jouer.
   *
   * Une demande prevenue est anonymisee dans la foulee, donc jamais relue : la
   * passe suivante ne la voit plus. `coveredNotifiedAt` est la ceinture sous la
   * bretelle — il tient l'invariant que le schema annonce, et il tiendra seul
   * le jour ou l'effacement immediat sera decouple de l'envoi.
   */
  it('n ecrit pas deux fois a un demandeur deja prevenu', async () => {
    const id = await openRequest(COVERED, RECENT)
    await db
      .update(attestationRequest)
      .set({ coveredAt: RECENT, coveredNotifiedAt: RECENT })
      .where(eq(attestationRequest.id, id))

    await advanceRequests(NOW)

    expect(mine(covered)).toHaveLength(0)
  })

  it('n envoie qu un mail et ne journalise qu une fois, meme sur deux passes', async () => {
    const id = await openRequest(COVERED, RECENT)
    await advanceRequests(NOW)
    await advanceRequests(new Date(NOW.getTime() + 3_600_000))

    expect(mine(covered)).toEqual([CLAIRE])
    const journal = await db.select({ type: event.type }).from(event).where(eq(event.subjectId, id))
    expect(journal.map((e) => e.type).sort()).toEqual(['lead.covered', 'lead.registered'])
  })

  /**
   * La case decochee n'ajourne pas l'effacement, elle l'avance.
   *
   * Personne n'attend plus rien de ces adresses : aucun mail ne partira, la
   * couverture est publiee, la demande est close. Les garder jusqu'a
   * l'echeance serait conserver une donnee sans finalite — et c'est
   * l'inutilite, pas l'envoi, qui declenche la minimisation.
   */
  it('anonymise des la couverture publiee quand la case n etait pas cochee', async () => {
    const id = await openRequest(COVERED, RECENT, false)
    await advanceRequests(NOW)

    expect(mine(covered)).toHaveLength(0)
    const row = await reread(id)
    expect(row.coveredAt).not.toBeNull()
    expect(row.anonymizedAt).not.toBeNull()
    expect(row.siret).toBeNull()
    expect(row.requesterEmail).toBeNull()
    expect(row.artisanEmail).toBeNull()
    // Rien n'a ete envoye : la colonne d'envoi reste vide, et le journal des
    // envois ne raconte donc pas un mail qui n'est jamais parti.
    expect(row.coveredNotifiedAt).toBeNull()
  })

  it('fige les jalons d une intention de copie sans ecrire a personne', async () => {
    const [row] = await db
      .insert(attestationRequest)
      .values({ siret: COVERED, channel: 'copied', notify: false, requestedAt: RECENT })
      .returning({ id: attestationRequest.id })
    await advanceRequests(NOW)

    expect((await reread(row.id)).coveredAt).not.toBeNull()
    expect(mine(covered)).toHaveLength(0)
  })
})

describe('advanceRequests, les trente jours', () => {
  it('envoie le message des trente jours puis anonymise', async () => {
    const id = await openRequest(UNKNOWN, OLD)
    await advanceRequests(NOW)

    expect(mine(noAnswer)).toEqual([CLAIRE])
    const row = await reread(id)
    expect(row.requesterEmail).toBeNull()
    expect(row.artisanEmail).toBeNull()
    expect(row.requesterName).toBeNull()
    expect(row.siret).toBeNull()
    expect(row.anonymizedAt).not.toBeNull()
  })

  it('garde les dates et le canal apres anonymisation', async () => {
    const id = await openRequest(UNKNOWN, OLD)
    await advanceRequests(NOW)

    const row = await reread(id)
    expect(row.requestedAt.getTime()).toBe(OLD.getTime())
    expect(row.channel).toBe('sent')
  })

  it('ne retraite jamais une demande deja anonymisee', async () => {
    const id = await openRequest(UNKNOWN, OLD)
    await advanceRequests(NOW)
    const first = (await reread(id)).anonymizedAt
    await advanceRequests(new Date(NOW.getTime() + 86_400_000))

    expect(mine(noAnswer)).toHaveLength(1)
    expect((await reread(id)).anonymizedAt).toEqual(first)
  })

  it('n ecrit a personne quand la case n etait pas cochee, et anonymise quand meme', async () => {
    const id = await openRequest(UNKNOWN, OLD, false)
    await advanceRequests(NOW)

    expect(mine(noAnswer)).toHaveLength(0)
    expect((await reread(id)).anonymizedAt).not.toBeNull()
  })

  /**
   * Les deux echeances dans la meme passe. Ecrire « nous n'avons rien recu » a
   * quelqu'un a qui on vient d'annoncer l'attestation serait se contredire dans
   * la meme minute : la bonne nouvelle gagne, et l'effacement a lieu de toute
   * facon.
   */
  it('annonce la couverture plutot que l echec quand les deux tombent ensemble', async () => {
    const id = await openRequest(COVERED, OLD)
    await advanceRequests(NOW)

    expect(mine(covered)).toEqual([CLAIRE])
    expect(mine(noAnswer)).toHaveLength(0)
    const row = await reread(id)
    expect(row.expiryNotifiedAt).toBeNull()
    expect(row.anonymizedAt).not.toBeNull()
  })
})

describe('advanceRequests, une relance sur le meme SIRET', () => {
  /**
   * Constate, non suppose : la passe boucle ligne par ligne sans regarder si
   * une autre porte le meme SIRET, donc les DEUX recoivent leurs jalons. C'est
   * ce qui rend necessaire l'ecart des relances dans `lead-metrics` : sans
   * lui, une seule inscription en compterait deux.
   */
  it('estampille les deux lignes, l origine et la relance', async () => {
    const origin = await openRequest(REGISTERED, RECENT)
    const relaunch = await openRequest(REGISTERED, RECENT, true, origin)

    await advanceRequests(NOW)

    // La meme entreprise des deux cotes : c'est deux fois la meme
    // inscription, pas deux inscriptions.
    for (const id of [origin, relaunch]) {
      expect((await reread(id)).registeredAt).not.toBeNull()
      expect((await reread(id)).companyId).toBe(COMPANIES[0])
    }
  })
})
