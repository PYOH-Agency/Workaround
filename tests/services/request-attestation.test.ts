import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { inArray, or, sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { attestationRequest, mailOptout } from '@/db/schema'
import { requestAttestation, type RequestState } from '@/app/verification/[siret]/actions'

const sent: { to: string }[] = []
vi.mock('@/services/lead-mail', () => ({
  sendAttestationRequest: async (input: { to: string }) => {
    sent.push(input)
  },
  sendRequestConfirmation: async () => {},
}))
vi.mock('@/services/rge-lookup', () => ({ fetchRgeRows: async () => [] }))

/**
 * SIRET et adresses propres a ce fichier : la base est partagee et vitest fait
 * tourner les fichiers en parallele. Reprendre ceux de
 * `attestation-request.test.ts` ferait que son `beforeEach` efface nos lignes
 * en plein milieu d'un test — un succes ressortirait alors refuse, ou
 * l'inverse. Aucune assertion ici ne porte sur un total : toutes filtrent sur
 * nos SIRET et nos adresses.
 */
const SIRET = '77733114400009'
const INVALID_SIRET = '77733114400000'

const ARTISAN = 'artisan@deux-chemins.test'
const REFUSANT = 'refusant@deux-chemins.test'
const OCCUPE = 'occupe@deux-chemins.test'
const CLAIRE = 'claire@deux-chemins.test'
const PAUL = 'paul@deux-chemins.test'
const OURS = [ARTISAN, REFUSANT, OCCUPE, CLAIRE, PAUL]

/** L'action lit `new Date()` : la scene de refus se monte donc a l'heure reelle. */
const ours = () =>
  or(
    inArray(attestationRequest.siret, [SIRET]),
    inArray(sql`lower(${attestationRequest.artisanEmail})`, OURS),
    inArray(sql`lower(${attestationRequest.requesterEmail})`, OURS),
  )

/** Nos lignes, et rien d'autre : jamais `select().from()` sans filtre. */
function ourRows() {
  return db.select().from(attestationRequest).where(ours())
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

const saisie = {
  siret: SIRET,
  channel: 'sent',
  requesterName: 'Claire',
  requesterEmail: CLAIRE,
  artisanEmail: ARTISAN,
  notify: 'on',
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

describe('requestAttestation, canal envoye', () => {
  it('rend le succes et cree la ligne', async () => {
    const state = await requestAttestation({}, form(saisie))

    expect(state).toEqual({ sent: true })
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(ARTISAN)

    const [row] = await ourRows()
    expect(row.siret).toBe(SIRET)
    expect(row.channel).toBe('sent')
    expect(row.requesterName).toBe('Claire')
    expect(row.requesterEmail).toBe(CLAIRE)
    expect(row.artisanEmail).toBe(ARTISAN)
    expect(row.notify).toBe(true)
  })

  it('respecte une case de notification decochee', async () => {
    // Une case decochee n'est pas envoyee du tout par le navigateur.
    const sansCase = form(saisie)
    sansCase.delete('notify')
    const state = await requestAttestation({}, sansCase)

    expect(state).toEqual({ sent: true })
    expect((await ourRows())[0].notify).toBe(false)
  })
})

/**
 * **LE test de cette tache.**
 *
 * Un refus et un succes rendent le MEME etat. Un refus par opposition
 * revelerait que l'artisan nous a demande de ne plus le contacter ; un refus
 * par treve de sept jours, qu'un autre demandeur est passe avant. Les deux sont
 * des informations sur un tiers, obtenues par la seule saisie d'un SIRET.
 *
 * Chaque scene verifie d'abord que le refus a REELLEMENT eu lieu — aucune
 * ligne, aucun mail — avant de comparer les etats. Sans cette verification, le
 * test passerait tout aussi bien sur deux succes, et ne prouverait rien.
 */
describe('requestAttestation, un refus ne se distingue pas d un succes', () => {
  it('rend le meme etat sur une opposition de l artisan', async () => {
    const succes = await requestAttestation({}, form(saisie))
    const avant = await ourRows()

    await db.insert(mailOptout).values({ email: REFUSANT })
    const refus = await requestAttestation(
      {},
      form({ ...saisie, requesterEmail: PAUL, requesterName: 'Paul', artisanEmail: REFUSANT }),
    )

    // Le refus est reel : rien n'a ete ecrit, rien n'est parti.
    expect(await ourRows()).toHaveLength(avant.length)
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(ARTISAN)

    // Et pourtant le demandeur lit exactement la meme chose.
    expect(refus).toEqual(succes)
  })

  it('rend le meme etat sur la treve de sept jours de l artisan', async () => {
    // Un premier demandeur a deja ecrit a cet artisan, il y a une heure.
    await db.insert(attestationRequest).values({
      siret: SIRET,
      channel: 'sent',
      notify: false,
      requesterEmail: PAUL,
      artisanEmail: OCCUPE,
      requestedAt: new Date(Date.now() - 3_600_000),
    })
    const avant = await ourRows()

    const refus = await requestAttestation({}, form({ ...saisie, artisanEmail: OCCUPE }))
    expect(await ourRows()).toHaveLength(avant.length)
    expect(sent).toHaveLength(0)

    const succes = await requestAttestation({}, form(saisie))
    expect(sent).toHaveLength(1)

    expect(refus).toEqual(succes)
  })
})

/**
 * Les seules erreurs que le demandeur doit voir : les siennes. Lui seul les a
 * commises, lui seul peut les corriger, et elles ne disent rien de personne.
 */
describe('requestAttestation, fautes de saisie', () => {
  const cas: [string, Record<string, string>, keyof NonNullable<RequestState['errors']>][] = [
    ['prenom manquant', { requesterName: '  ' }, 'requesterName'],
    ['adresse du demandeur sans arobase', { requesterEmail: 'claire' }, 'requesterEmail'],
    ['adresse de l artisan sans arobase', { artisanEmail: 'artisan' }, 'artisanEmail'],
    ['SIRET a la cle fausse', { siret: INVALID_SIRET }, 'siret'],
  ]

  for (const [nom, faute, champ] of cas) {
    it(`nomme le champ fautif : ${nom}`, async () => {
      const state = await requestAttestation({}, form({ ...saisie, ...faute }))

      expect(state.sent).toBeUndefined()
      expect(state.errors?.[champ]).toBeTruthy()
      expect(await ourRows()).toHaveLength(0)
      expect(sent).toHaveLength(0)
    })
  }

  /**
   * Les messages sont distincts entre eux : trois champs qui renverraient la
   * meme phrase laisseraient le demandeur chercher lequel reprendre.
   */
  it('ne dit pas la meme chose du prenom et du SIRET', async () => {
    const prenom = await requestAttestation({}, form({ ...saisie, requesterName: '' }))
    const numero = await requestAttestation({}, form({ ...saisie, siret: INVALID_SIRET }))

    expect(prenom.errors?.requesterName).not.toBe(numero.errors?.siret)
  })
})

describe('requestAttestation, canal copie', () => {
  it('n enregistre aucun contact et n envoie rien', async () => {
    const state = await requestAttestation({}, form({ siret: SIRET, channel: 'copied' }))

    expect(state).toEqual({ sent: true })
    expect(sent).toHaveLength(0)

    const [row] = await ourRows()
    expect(row.channel).toBe('copied')
    expect(row.requesterEmail).toBeNull()
    expect(row.artisanEmail).toBeNull()
    expect(row.requesterName).toBeNull()
    expect(row.notify).toBe(false)
  })

  /**
   * Le formulaire d'a cote peut avoir ete rempli avant le clic sur « copier ».
   * Ces champs ne doivent pas suivre : nous n'avons rien promis d'en faire.
   */
  it('ignore les contacts qui accompagneraient une intention de copie', async () => {
    await requestAttestation({}, form({ ...saisie, channel: 'copied' }))

    const [row] = await ourRows()
    expect(row.channel).toBe('copied')
    expect(row.requesterEmail).toBeNull()
    expect(row.artisanEmail).toBeNull()
    expect(sent).toHaveLength(0)
  })
})
