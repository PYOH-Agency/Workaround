import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { company, customer, project, property, quote } from '@/db/schema'
import { resendQuoteLinks } from '@/services/quote-link'
import { requestQuoteLink } from '@/actions/public'
import { clearMailbox, quoteLinkFor } from '../e2e/helpers'

/**
 * L'invariante de reponse neutre est la propriete de securite de toute la
 * fonctionnalite : un devis existant ou non, un envoi bloque par la
 * limitation ou non, l'appelant ne doit jamais rien pouvoir en deduire. Ces
 * tests verrouillent ce comportement, pas seulement le chemin heureux.
 *
 * Isolation par entreprise et adresse generees, comme le fait deja
 * invoice-fixtures.ts : partager une entreprise ou une adresse entre tests
 * les rendrait dependants de leur ordre, notamment a cause de la table de
 * garde qui compte les demandes par adresse.
 */

const MAILBOX = process.env.MAILBOX_URL ?? 'http://127.0.0.1:54324'

const someSiret = () => randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14)

let companyId: string

beforeAll(async () => {
  await clearMailbox()

  const [row] = await db
    .insert(company)
    .values({ siret: someSiret(), legalName: 'Entreprise de test' })
    .returning()
  companyId = row.id
})

afterAll(async () => {
  await connection.end()
})

/** Un chantier, avec son client et son logement, pour l'adresse donnee. */
async function projectFor(email: string): Promise<string> {
  const [customerRow] = await db
    .insert(customer)
    .values({ companyId, name: 'Client de test', email })
    .returning()

  const [propertyRow] = await db
    .insert(property)
    .values({
      fingerprint: randomUUID(),
      addressLine1: '1 rue du Test',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    .returning()

  const [projectRow] = await db
    .insert(project)
    .values({
      companyId,
      customerId: customerRow.id,
      propertyId: propertyRow.id,
      label: 'Chantier de test',
    })
    .returning()

  return projectRow.id
}

/** Un devis pour ce chantier, au statut donne. */
async function quoteFor(projectId: string, status: 'draft' | 'sent') {
  const [row] = await db
    .insert(quote)
    .values({
      projectId,
      companyId,
      number: `D2026-${randomUUID().slice(0, 8)}`,
      status,
      totalInclTax: 100700,
      publicToken: randomUUID(),
    })
    .returning()

  return row
}

/**
 * Compte les messages de devis recus par une adresse.
 *
 * Un seul appel suffit, sans sondage : `resendQuoteLinks` attend la fin de
 * chaque envoi avant de rendre la main, et le collecteur local persiste le
 * message des la fin de la transaction SMTP. Rien n'est encore en vol quand
 * cette fonction est appelee apres un `await`.
 */
async function countQuoteMailsTo(email: string): Promise<number> {
  const response = await fetch(`${MAILBOX}/api/v1/messages?limit=50`)
  const { messages = [] } = (await response.json()) as {
    messages?: { Subject: string; To: { Address: string }[] }[]
  }
  return messages.filter(
    (mail) => mail.To.some((to) => to.Address === email) && /devis/i.test(mail.Subject),
  ).length
}

describe('resendQuoteLinks', () => {
  it("n'echoue pas et n'envoie rien pour une adresse sans aucun devis", async () => {
    const email = `inconnu-${randomUUID()}@test.local`

    await expect(resendQuoteLinks(email, new Date())).resolves.toBeUndefined()
    expect(await countQuoteMailsTo(email)).toBe(0)
  })

  it('envoie le lien du devis a une adresse qui en a recu un', async () => {
    const email = `client-${randomUUID()}@test.local`
    const projectId = await projectFor(email)
    const created = await quoteFor(projectId, 'sent')

    await resendQuoteLinks(email, new Date())

    const link = await quoteLinkFor(email)
    expect(link).toContain(`/d/${created.publicToken}`)
  })

  it('ne renvoie jamais un devis en brouillon', async () => {
    const email = `brouillon-${randomUUID()}@test.local`
    const projectId = await projectFor(email)
    await quoteFor(projectId, 'draft')

    await resendQuoteLinks(email, new Date())

    expect(await countQuoteMailsTo(email)).toBe(0)
  })

  it("retrouve le devis quelle que soit la casse de l'adresse enregistree", async () => {
    // `createProject` stocke l'adresse telle que saisie par l'artisan, sans la
    // normaliser (src/services/projects.ts) : ce test verrouille la
    // comparaison insensible a la casse ajoutee dans le service, sans quoi
    // cette adresse mixte ne retrouverait jamais son devis.
    const storedEmail = `Client.Casse.${randomUUID()}@Test.Local`
    const lookupEmail = storedEmail.toLowerCase()

    const projectId = await projectFor(storedEmail)
    const created = await quoteFor(projectId, 'sent')

    await resendQuoteLinks(lookupEmail, new Date())

    const link = await quoteLinkFor(lookupEmail)
    expect(link).toContain(`/d/${created.publicToken}`)
  })

  it('bloque la quatrieme demande dans l heure, pas les trois premieres', async () => {
    const email = `plafond-${randomUUID()}@test.local`
    const projectId = await projectFor(email)
    await quoteFor(projectId, 'sent')

    const start = new Date('2026-08-09T10:00:00Z')

    for (let i = 0; i < 3; i++) {
      await resendQuoteLinks(email, new Date(start.getTime() + i * 60_000))
    }

    // Les trois premieres demandes doivent chacune avoir produit un envoi
    // avant qu'on tente la quatrieme — sinon un « 3 » par accident ne
    // prouverait rien sur ce qui suit.
    await expect.poll(() => countQuoteMailsTo(email), { timeout: 2000 }).toBe(3)

    await resendQuoteLinks(email, new Date(start.getTime() + 3 * 60_000))

    // Delai d'observation volontaire : on s'assure qu'un envoi tardif et
    // inattendu aurait eu le temps d'arriver avant de conclure qu'il n'y en a
    // pas eu.
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(await countQuoteMailsTo(email)).toBe(3)
  })
})

describe('requestQuoteLink', () => {
  it('rend toujours le meme succes, que l adresse soit connue ou non', async () => {
    const unknownEmail = `action-inconnue-${randomUUID()}@test.local`
    const knownEmail = `action-connue-${randomUUID()}@test.local`
    const projectId = await projectFor(knownEmail)
    await quoteFor(projectId, 'sent')

    const unknownForm = new FormData()
    unknownForm.set('email', unknownEmail)
    const knownForm = new FormData()
    knownForm.set('email', knownEmail)

    expect(await requestQuoteLink({}, unknownForm)).toEqual({ sent: true })
    expect(await requestQuoteLink({}, knownForm)).toEqual({ sent: true })
  })
})
