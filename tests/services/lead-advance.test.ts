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

/**
 * `advanceRequests` balaie TOUTES les demandes non anonymisees, y compris
 * celles que les autres fichiers de test laissent derriere eux. Aucune
 * assertion ne porte donc sur un total : nos lignes sont relues par leur
 * identifiant, et les envois filtres sur notre domaine.
 */
const mine = (list: string[]) => list.filter((to) => to.endsWith(DOMAIN))

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

  it('fige la couverture sans ecrire quand la case n etait pas cochee', async () => {
    const id = await openRequest(COVERED, RECENT, false)
    await advanceRequests(NOW)

    const row = await reread(id)
    expect(row.coveredAt).not.toBeNull()
    expect(mine(covered)).toHaveLength(0)
    // Aucun mail n'est parti : rien ne justifie d'effacer avant l'echeance.
    expect(row.anonymizedAt).toBeNull()
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
