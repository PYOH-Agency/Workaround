import { randomUUID } from 'node:crypto'
import { load, userIdFor } from './fixtures-db'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

/**
 * Amene l'artisan connecte a l'etat « chantier termine en retard ».
 *
 * Le parcours de la contestation commence la : ce qui precede — devis, envoi,
 * signature, facturation — est deja couvert par les autres parcours, et le
 * rejouer doublerait la duree du test sans rien prouver de neuf.
 *
 * Signe il y a quarante jours, termine hier, cinq jours ouvres engages : le
 * chantier est donc en retard, et lui seul est contestable.
 */
export async function lateChantierFor(email: string) {
  const { db, schema } = await load()
  const { company, customer, member, project, property, quote, quoteLine } = schema

  const userId = await userIdFor(email)

  const [companyRow] = await db
    .insert(company)
    .values({
      siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
      legalName: 'COUVERTURE DU PARCOURS',
      addressLine1: '8 rue Sainte-Catherine',
      postalCode: '33000',
      city: 'Bordeaux',
      legalFormLabel: 'SAS',
      registrationNumber: 'RCS Bordeaux 000 000 000',
      phone: '0556000000',
      email: 'contact@couverture.local',
      vatNumber: 'FR00000000000',
      paymentTerms: 'Solde à réception des travaux.',
      insurerName: 'SMABTP',
      insurerAddress: '114 avenue Émile Zola, 75015 Paris',
      policyNumber: 'D-2026-000999',
      coveredActivities: 'Couverture',
      coverageArea: 'France métropolitaine',
    })
    .returning()

  await db.insert(member).values({ companyId: companyRow.id, userId, email, role: 'owner' })

  const customerEmail = `client-m5c-${randomUUID().slice(0, 8)}@test.local`

  const [customerRow] = await db
    .insert(customer)
    .values({ companyId: companyRow.id, name: 'Claire Dubois', email: customerEmail })
    .returning()

  const [propertyRow] = await db
    .insert(property)
    .values({
      fingerprint: randomUUID(),
      addressLine1: '3 rue Notre-Dame',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    .returning()

  const [projectRow] = await db
    .insert(project)
    .values({
      companyId: companyRow.id,
      customerId: customerRow.id,
      propertyId: propertyRow.id,
      label: 'Réfection de toiture',
    })
    .returning()

  const [quoteRow] = await db
    .insert(quote)
    .values({
      projectId: projectRow.id,
      companyId: companyRow.id,
      number: 'D2026-0001',
      status: 'signed',
      committedLeadTimeDays: 5,
      totalExclTax: 91000,
      totalTax: 9700,
      totalInclTax: 100700,
      publicToken: randomUUID(),
      sentAt: daysAgo(45),
      signedAt: daysAgo(40),
      completedAt: daysAgo(1),
      completionSource: 'invoiced',
    })
    .returning()

  await db.insert(quoteLine).values({
    quoteId: quoteRow.id,
    position: 0,
    label: 'Réfection de toiture',
    quantity: '1',
    unitPriceExclTax: 91000,
    taxRate: 1000,
  })

  return { quoteId: quoteRow.id, customerEmail }
}
