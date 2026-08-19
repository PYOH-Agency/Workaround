import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { inArray, or } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { attestationRequest, verificationLookup } from '@/db/schema'
import { leadFunnel, openRequests } from '@/services/lead-metrics'

/**
 * Une fenetre propre a ce fichier, tres loin de toutes les autres dates de
 * test (2026, cote lead-advance et compagnie). Vitest fait tourner les
 * fichiers en parallele sur une base partagee, et `leadFunnel` agrege TOUT ce
 * qui tombe dans l'intervalle demande : sans cette distance, une assertion
 * absolue serait a la merci d'une ligne posee par un autre fichier au meme
 * moment. Avec une fenetre qu'aucun autre test n'approche, compter en absolu
 * redevient fiable — pas besoin de mesurer un delta avant/apres.
 */
const FROM = new Date('2099-03-01T00:00:00.000Z')
const TO = new Date('2099-03-31T23:59:59.999Z')
const IN_WINDOW = new Date('2099-03-15T12:00:00.000Z')
const BEFORE_WINDOW = new Date('2099-02-28T23:59:59.999Z')
const AFTER_WINDOW = new Date('2099-04-01T00:00:00.000Z')
const ON_FROM = FROM
const ON_TO = TO
const OLDER_IN_WINDOW = new Date(IN_WINDOW.getTime() - 3_600_000)

const SIRET_A = '11122333300001'
const SIRET_B = '22233444400007'
const SIRET_C = '33344555500001'

// `attestationRequest.siret` peut etre nul (ligne anonymisee) : une demande
// posee sans SIRET n'est retrouvee au nettoyage que par sa date, exactement
// comme le fait `lead-advance-fixtures`.
const OUR_DATES = [IN_WINDOW, BEFORE_WINDOW, AFTER_WINDOW, ON_FROM, ON_TO, OLDER_IN_WINDOW]

async function cleanup() {
  await db
    .delete(verificationLookup)
    .where(inArray(verificationLookup.siret, [SIRET_A, SIRET_B, SIRET_C]))
  await db
    .delete(attestationRequest)
    .where(
      or(
        inArray(attestationRequest.siret, [SIRET_A, SIRET_B, SIRET_C]),
        inArray(attestationRequest.requestedAt, OUR_DATES),
      ),
    )
}

beforeEach(cleanup)
afterAll(async () => {
  await cleanup()
  await connection.end()
})

describe('leadFunnel, la fenetre', () => {
  it('ne compte que la periode demandee', async () => {
    await db.insert(verificationLookup).values([
      { siret: SIRET_A, outcome: 'stranger', entry: 'demandeur', lookedUpAt: IN_WINDOW },
      { siret: SIRET_B, outcome: 'stranger', entry: 'demandeur', lookedUpAt: BEFORE_WINDOW },
      { siret: SIRET_C, outcome: 'stranger', entry: 'demandeur', lookedUpAt: AFTER_WINDOW },
    ])

    const result = await leadFunnel(FROM, TO)

    expect(result.lookups).toBe(1)
  })

  it('inclut les bornes : une ligne posee pile sur `from` ou `to` compte', async () => {
    await db.insert(verificationLookup).values([
      { siret: SIRET_A, outcome: 'stranger', entry: 'demandeur', lookedUpAt: ON_FROM },
      { siret: SIRET_B, outcome: 'stranger', entry: 'demandeur', lookedUpAt: ON_TO },
    ])

    const result = await leadFunnel(FROM, TO)

    expect(result.lookups).toBe(2)
  })

  it('une demande anonymisee compte comme les autres', async () => {
    // La propriete centrale : siret, requesterEmail et artisanEmail nuls,
    // anonymizedAt renseigne, mais les dates intactes. Rien de personnel n'a
    // ete relu pour produire ce chiffre.
    await db.insert(attestationRequest).values({
      siret: null,
      requesterName: null,
      requesterEmail: null,
      artisanEmail: null,
      channel: 'sent',
      notify: false,
      requestedAt: IN_WINDOW,
      registeredAt: IN_WINDOW,
      depositedAt: IN_WINDOW,
      coveredAt: IN_WINDOW,
      anonymizedAt: IN_WINDOW,
    })

    const result = await leadFunnel(FROM, TO)

    expect(result.requests).toBe(1)
    expect(result.registered).toBe(1)
    expect(result.deposited).toBe(1)
    expect(result.covered).toBe(1)
  })

  it('compte les canaux et les recherches non couvertes', async () => {
    await db.insert(verificationLookup).values([
      { siret: SIRET_A, outcome: 'covered', entry: 'demandeur', lookedUpAt: IN_WINDOW },
      { siret: SIRET_B, outcome: 'uncovered_member', entry: 'demandeur', lookedUpAt: IN_WINDOW },
    ])
    await db.insert(attestationRequest).values([
      { siret: SIRET_A, channel: 'sent', notify: true, requestedAt: IN_WINDOW },
      { siret: SIRET_B, channel: 'copied', notify: false, requestedAt: IN_WINDOW },
    ])

    const result = await leadFunnel(FROM, TO)

    expect(result.lookups).toBe(2)
    expect(result.uncovered).toBe(1)
    expect(result.requests).toBe(2)
    expect(result.sent).toBe(1)
    expect(result.copied).toBe(1)
  })
})

describe('openRequests', () => {
  it('rend les demandes vivantes, la plus recente en tete', async () => {
    await db.insert(attestationRequest).values([
      { siret: SIRET_A, channel: 'sent', notify: true, requestedAt: OLDER_IN_WINDOW },
      { siret: SIRET_B, channel: 'sent', notify: true, requestedAt: IN_WINDOW },
    ])

    const rows = await openRequests(new Date('2099-03-20T00:00:00.000Z'))
    const ours = rows.filter((r) => r.siret === SIRET_A || r.siret === SIRET_B)

    expect(ours.map((r) => r.siret)).toEqual([SIRET_B, SIRET_A])
  })

  it('ecarte les demandes anonymisees', async () => {
    await db.insert(attestationRequest).values([
      { siret: SIRET_A, channel: 'sent', notify: true, requestedAt: IN_WINDOW },
      {
        siret: null,
        requesterEmail: null,
        artisanEmail: null,
        channel: 'sent',
        notify: true,
        requestedAt: IN_WINDOW,
        anonymizedAt: IN_WINDOW,
      },
    ])

    const rows = await openRequests(new Date('2099-03-20T00:00:00.000Z'))

    // La ligne anonymisee n'a plus de siret : on verifie que le nombre de
    // demandes vivantes qui nous appartiennent n'en compte qu'une, celle qui
    // porte encore SIRET_A.
    const ours = rows.filter((r) => r.siret === SIRET_A)
    expect(ours).toHaveLength(1)
    expect(rows.some((r) => r.siret === null)).toBe(false)
  })
})
