import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { eq, inArray, or, sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { attestationRequest, mailOptout } from '@/db/schema'
import { createRequest, relaunchRequest } from '@/services/attestation-request'

const sent: { to: string }[] = []
vi.mock('@/services/lead-mail', () => ({
  sendAttestationRequest: async (input: { to: string }) => {
    sent.push(input)
  },
  sendRequestConfirmation: async () => {},
}))
vi.mock('@/services/rge-lookup', () => ({ fetchRgeRows: async () => [] }))

/**
 * SIRET a la cle de Luhn juste et adresses **propres a ce fichier** : la base
 * est partagee et vitest fait tourner les fichiers en parallele. Reprendre ceux
 * d'`attestation-request.test.ts` ferait que son `beforeEach` efface nos lignes
 * en plein test — la treve de sept jours ressortirait alors franchie ou non
 * selon l'ordonnancement. Aucune assertion ici ne porte sur un total.
 */
const SIRET = '66655544400007'

const ARTISAN = 'artisan@relance-test.fr'
const CLAIRE = 'claire@relance-test.fr'
const OURS = [ARTISAN, CLAIRE]

const NOW = new Date('2026-08-19T12:00:00Z')
const DAY = 86_400_000
const later = (days: number) => new Date(NOW.getTime() + days * DAY)

/**
 * L'instant de la ligne anonymisee, et rien d'autre.
 *
 * Une demande anonymisee n'a plus ni SIRET ni adresse : aucun filtre de contenu
 * ne peut la retrouver pour la nettoyer. Cette date, propre a ce fichier, lui
 * tient lieu de marque et survit au redemarrage du processus — sans elle, un
 * second passage sans `db:reset` laisserait la ligne derriere lui.
 */
const ANON_AT = new Date('1999-04-05T06:07:08Z')

const ours = () =>
  or(
    eq(attestationRequest.siret, SIRET),
    inArray(sql`lower(${attestationRequest.artisanEmail})`, OURS),
    inArray(sql`lower(${attestationRequest.requesterEmail})`, OURS),
    eq(attestationRequest.requestedAt, ANON_AT),
  )

/** Nos lignes, et rien d'autre : jamais `select().from()` sans filtre. */
function ourRows() {
  return db.select().from(attestationRequest).where(ours())
}

const base = {
  siret: SIRET,
  channel: 'sent' as const,
  notify: true,
  requesterName: 'Claire',
  requesterEmail: CLAIRE,
  artisanEmail: ARTISAN,
}

/** Une premiere demande, deja partie — le point de depart de toute relance. */
async function firstRequest(): Promise<string> {
  expect(await createRequest(base, NOW)).toBe('ok')
  sent.length = 0
  const [row] = await ourRows()
  return row.id
}

beforeEach(async () => {
  sent.length = 0
  // On efface AVANT d'ecrire : la base n'est pas reinitialisee entre deux
  // passages, et une trace du passage precedent declencherait la treve de sept
  // jours des le premier test.
  await db.delete(attestationRequest).where(ours())
  await db.delete(mailOptout).where(inArray(sql`lower(${mailOptout.email})`, OURS))
})

afterAll(async () => connection.end())

describe('relaunchRequest, les memes gardes que le public', () => {
  it('refuse tant que la treve de sept jours n est pas ecoulee', async () => {
    const id = await firstRequest()

    expect(await relaunchRequest(id, later(2))).toBe('artisan_cooldown')

    // Le refus n'envoie rien, et n'ecrit rien : une ligne posee sur un refus
    // repousserait la treve d'autant, sans qu'aucun mail ne soit parti.
    expect(sent).toHaveLength(0)
    expect(await ourRows()).toHaveLength(1)
  })

  it('relance apres sept jours', async () => {
    const id = await firstRequest()

    expect(await relaunchRequest(id, later(8))).toBe('ok')

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(ARTISAN)

    const rows = await ourRows()
    expect(rows).toHaveLength(2)

    // La relance repart du meme couple : c'est bien la demande d'origine qui
    // est relancee, pas une demande neuve inventee par l'ecran d'admin.
    const [relance] = rows.filter((row) => row.requestedAt.getTime() === later(8).getTime())
    expect(relance.siret).toBe(SIRET)
    expect(relance.channel).toBe('sent')
    expect(relance.requesterEmail).toBe(CLAIRE)
    expect(relance.artisanEmail).toBe(ARTISAN)
    expect(relance.requesterName).toBe('Claire')
    expect(relance.notify).toBe(true)
  })

  it('marque la relance, et laisse la demande publique vierge', async () => {
    const id = await firstRequest()

    const [origine] = await ourRows()
    // Un geste de visiteur ne pointe rien : c'est lui, et lui seul, que
    // l'entonnoir compte comme une demande.
    expect(origine.relaunchOf).toBeNull()

    expect(await relaunchRequest(id, later(8))).toBe('ok')

    const rows = await ourRows()
    const [relance] = rows.filter((row) => row.id !== id)
    expect(relance.relaunchOf).toBe(id)
  })

  it('rattache une relance de relance a la demande d origine, pas au maillon precedent', async () => {
    const id = await firstRequest()
    expect(await relaunchRequest(id, later(8))).toBe('ok')
    const [premiere] = (await ourRows()).filter((row) => row.id !== id)

    // Huit jours de plus : la treve de l'artisan est de nouveau franchie.
    expect(await relaunchRequest(premiere.id, later(16))).toBe('ok')

    const [seconde] = (await ourRows()).filter(
      (row) => row.id !== id && row.id !== premiere.id,
    )
    // La chaine reste plate : `relaunch_of` renseigne dit « geste de chez
    // nous », sans qu'aucun lecteur ait a la remonter pour le savoir.
    expect(seconde.relaunchOf).toBe(id)
  })

  it('respecte une opposition posterieure a la demande', async () => {
    const id = await firstRequest()
    await db.insert(mailOptout).values({ email: ARTISAN })

    // Huit jours : la treve est franchie, donc seule l'opposition peut refuser.
    expect(await relaunchRequest(id, later(8))).toBe('opted_out')

    expect(sent).toHaveLength(0)
    expect(await ourRows()).toHaveLength(1)
  })

  it('refuse une seconde relance dans les vingt-quatre heures', async () => {
    const id = await firstRequest()

    expect(await relaunchRequest(id, later(8))).toBe('ok')
    sent.length = 0

    // La treve de l'artisan protege deja ce cas ; c'est elle qui parle en
    // premier, et c'est l'ordre voulu par `guardVerdict`.
    expect(await relaunchRequest(id, later(8.5))).toBe('artisan_cooldown')
    expect(sent).toHaveLength(0)
    expect(await ourRows()).toHaveLength(2)
  })
})

describe('relaunchRequest, ce qui n a rien a relancer', () => {
  it('ne relance pas une demande anonymisee', async () => {
    // Ce que `advanceRequests` laisse a trente jours : les dates et le canal,
    // plus aucun contact.
    const [row] = await db
      .insert(attestationRequest)
      .values({
        siret: null,
        channel: 'sent',
        notify: true,
        requestedAt: ANON_AT,
        anonymizedAt: ANON_AT,
      })
      .returning({ id: attestationRequest.id })

    expect(await relaunchRequest(row.id, later(8))).toBe('already_requested')

    expect(sent).toHaveLength(0)
    expect(await ourRows()).toHaveLength(1)
  })

  it('ne relance pas une demande copiee, qui n a jamais eu d adresse d artisan', async () => {
    expect(await createRequest({ siret: SIRET, channel: 'copied', notify: false }, NOW)).toBe('ok')
    const [row] = await ourRows()

    expect(await relaunchRequest(row.id, later(8))).toBe('already_requested')

    expect(sent).toHaveLength(0)
    expect(await ourRows()).toHaveLength(1)
  })

  it('leve sur un identifiant inexistant', async () => {
    // Aucune ligne n'est jamais supprimee — seulement anonymisee. Un
    // identifiant inconnu ne vient donc pas d'une liste perimee mais d'une
    // adresse forgee : le taire derriere un verdict le ferait passer pour un
    // refus ordinaire.
    await expect(
      relaunchRequest('00000000-0000-4000-8000-000000000000', later(8)),
    ).rejects.toThrow()
    expect(sent).toHaveLength(0)
  })
})
