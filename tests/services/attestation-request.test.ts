import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { attestationRequest, mailOptout } from '@/db/schema'
import { createRequest } from '@/services/attestation-request'

const sent: { to: string }[] = []
vi.mock('@/services/lead-mail', () => ({
  sendAttestationRequest: async (input: { to: string }) => {
    sent.push(input)
  },
  sendRequestConfirmation: async () => {},
}))
vi.mock('@/services/rge-lookup', () => ({ fetchRgeRows: async () => [] }))

/**
 * Deux SIRET a la cle de Luhn juste, propres a ce fichier : la base est
 * partagee et vitest fait tourner les fichiers en parallele. Aucune assertion
 * ici ne porte sur un total — seulement sur nos lignes, filtrees par nos SIRET
 * et nos adresses.
 */
const SIRET = '88877766600007'
const OTHER_SIRET = '88877766600015'
const NOW = new Date('2026-08-19T12:00:00Z')

const ARTISAN = 'artisan@demande-test.fr'
const CLAIRE = 'claire@demande-test.fr'
const PAUL = 'paul@demande-test.fr'
const OURS = [ARTISAN, CLAIRE, PAUL]

const base = {
  siret: SIRET,
  requesterName: 'Claire',
  requesterEmail: CLAIRE,
  artisanEmail: ARTISAN,
  notify: true,
}

/** Nos lignes, et rien d'autre : jamais `select().from()` sans filtre. */
function ourRows() {
  return db
    .select()
    .from(attestationRequest)
    .where(
      or(
        inArray(attestationRequest.siret, [SIRET, OTHER_SIRET]),
        inArray(sql`lower(${attestationRequest.artisanEmail})`, OURS),
        inArray(sql`lower(${attestationRequest.requesterEmail})`, OURS),
      ),
    )
}

beforeEach(async () => {
  sent.length = 0
  // On efface AVANT d'ecrire : la base n'est pas reinitialisee entre deux
  // passages, et une trace laissee par le passage precedent declencherait la
  // treve de sept jours au tout premier test.
  await db
    .delete(attestationRequest)
    .where(
      or(
        inArray(attestationRequest.siret, [SIRET, OTHER_SIRET]),
        inArray(sql`lower(${attestationRequest.artisanEmail})`, OURS),
        inArray(sql`lower(${attestationRequest.requesterEmail})`, OURS),
      ),
    )
  await db.delete(mailOptout).where(inArray(sql`lower(${mailOptout.email})`, OURS))
})

afterAll(async () => connection.end())

describe('createRequest, canal envoye', () => {
  it('enregistre la demande et envoie un mail', async () => {
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('ok')
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(ARTISAN)

    const [row] = await ourRows()
    expect(row.channel).toBe('sent')
    expect(row.notify).toBe(true)
  })

  /**
   * L'obligation qui n'a pas d'alarme.
   *
   * Le test precedent passerait encore si la ligne etait ecrite sans ses
   * adresses ni sa date : les trois fenetres de garde lisent precisement ces
   * colonnes-la, et une ligne amputee les laisse vides pour toujours. On
   * verifie donc ce que les gardes reliront, pas seulement qu'une ligne existe.
   */
  it('enregistre exactement ce que les gardes reliront', async () => {
    await createRequest({ ...base, channel: 'sent' }, NOW)

    const [row] = await ourRows()
    expect(row.siret).toBe(SIRET)
    expect(row.artisanEmail).toBe(ARTISAN)
    expect(row.requesterEmail).toBe(CLAIRE)
    expect(row.requesterName).toBe('Claire')
    expect(row.requestedAt.getTime()).toBe(NOW.getTime())
  })

  /**
   * Le doublon de couple, sur la seule scene ou il peut se jouer.
   *
   * `guardVerdict` protege l'artisan AVANT de nommer le doublon : reposter la
   * meme demande a la meme adresse rend `artisan_cooldown`, jamais
   * `already_requested`. Le doublon parle donc quand le demandeur revient sur
   * le meme SIRET dans les vingt-quatre heures avec une AUTRE adresse
   * d'artisan — une adresse corrigee, trouvee ailleurs. C'est la, et
   * seulement la, que la fenetre de vingt-quatre heures fait son travail : elle
   * empeche d'arroser une entreprise a deux adresses le meme jour.
   */
  it('refuse un doublon dans les vingt-quatre heures, sans second mail', async () => {
    await createRequest({ ...base, channel: 'sent' }, NOW)
    const again = await createRequest(
      { ...base, channel: 'sent', artisanEmail: PAUL },
      new Date(NOW.getTime() + 3_600_000),
    )

    expect(again).toBe('already_requested')
    expect(sent).toHaveLength(1)
  })

  /**
   * Et le meme geste, adresse identique : c'est la treve de l'artisan qui
   * parle. Sans ce test, le changement d'adresse du test precedent passerait
   * pour un detail de mise en scene plutot que pour l'ordre des gardes.
   */
  it('nomme la treve artisan quand le demandeur reposte a la meme adresse', async () => {
    await createRequest({ ...base, channel: 'sent' }, NOW)
    const again = await createRequest(
      { ...base, channel: 'sent' },
      new Date(NOW.getTime() + 3_600_000),
    )

    expect(again).toBe('artisan_cooldown')
    expect(sent).toHaveLength(1)
  })

  it('protege l artisan d un second demandeur dans les sept jours', async () => {
    await createRequest({ ...base, channel: 'sent' }, NOW)
    const other = await createRequest(
      { ...base, channel: 'sent', requesterEmail: PAUL, requesterName: 'Paul' },
      new Date(NOW.getTime() + 2 * 86_400_000),
    )

    expect(other).toBe('artisan_cooldown')
    expect(sent).toHaveLength(1)
  })

  it('respecte une opposition', async () => {
    await db.insert(mailOptout).values({ email: ARTISAN })
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('opted_out')
    expect(sent).toHaveLength(0)
  })

  /**
   * Un refus qui ecrirait s'auto-bloquerait.
   *
   * Une ligne posee sur un refus alimente elle-meme les trois fenetres : le
   * demandeur refuse une fois le resterait, sans qu'aucun mail ne soit jamais
   * parti. Le refus doit donc etre entierement muet, en base comme en SMTP.
   */
  it('n ecrit rien et n envoie rien sur un refus', async () => {
    await db.insert(mailOptout).values({ email: ARTISAN })
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('opted_out')
    expect(sent).toHaveLength(0)
    expect(await ourRows()).toHaveLength(0)
  })
})

/**
 * L'invariant que le schema annonce sur les colonnes d'adresse — et qui ne
 * repose sur rien tant qu'un test ne le tient pas. Une opposition contournee
 * par une majuscule, c'est un mail a quelqu'un qui a dit non.
 */
describe('createRequest, casse des adresses', () => {
  it('respecte une opposition inscrite en majuscules', async () => {
    await db.insert(mailOptout).values({ email: 'Artisan@Demande-Test.FR' })
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('opted_out')
    expect(sent).toHaveLength(0)
  })

  it('respecte une opposition minuscule face a une demande en majuscules', async () => {
    await db.insert(mailOptout).values({ email: ARTISAN })
    const result = await createRequest(
      { ...base, channel: 'sent', artisanEmail: 'Artisan@Demande-Test.FR' },
      NOW,
    )

    expect(result).toBe('opted_out')
    expect(sent).toHaveLength(0)
  })
})

describe('createRequest, canal copie', () => {
  it('n enregistre aucun contact et n envoie rien', async () => {
    const result = await createRequest({ siret: SIRET, channel: 'copied', notify: false }, NOW)

    expect(result).toBe('ok')
    expect(sent).toHaveLength(0)

    const [row] = await ourRows()
    expect(row.channel).toBe('copied')
    expect(row.requesterEmail).toBeNull()
    expect(row.artisanEmail).toBeNull()
    expect(row.notify).toBe(false)
  })

  it('ne compte jamais dans la treve de l artisan', async () => {
    // Une intention de copie n'a envoye aucun mail : elle ne doit pas
    // consommer le credit de sept jours d'un artisan.
    await createRequest({ siret: SIRET, channel: 'copied', notify: false }, NOW)
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('ok')
    expect(sent).toHaveLength(1)

    const copied = await db
      .select()
      .from(attestationRequest)
      .where(and(eq(attestationRequest.siret, SIRET), eq(attestationRequest.channel, 'copied')))
    expect(copied).toHaveLength(1)
  })
})
