import { randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { customer, project, property, quote } from '@/db/schema'
import { createCompany } from './invoice-fixtures'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

/**
 * Un chantier signe il y a quarante jours, termine hier, cinq jours ouvres
 * engages : en retard, donc contestable.
 *
 * Chaque appel cree sa propre entreprise et son propre client — la contestation
 * est immuable par declencheur, rien ne se nettoie, et les tests doivent rester
 * rejouables sans `supabase db reset` prealable.
 *
 * Le nom et l'adresse du client sont uniques a chaque appel : c'est ce qui rend
 * discriminant le test « aucune donnee personnelle au journal ». Un temoin
 * partage produirait une correspondance ambigue — la lecon de M4.
 */
export async function lateChantier() {
  const companyId = await createCompany()

  const customerEmail = `client-${randomUUID().slice(0, 8)}@test.local`
  const customerName = `Temoin ${randomUUID().slice(0, 8)}`

  const [customerRow] = await db
    .insert(customer)
    .values({ companyId, name: customerName, email: customerEmail })
    .returning()

  const [propertyRow] = await db
    .insert(property)
    .values({
      fingerprint: randomUUID(),
      addressLine1: '2 rue du Retard',
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
      label: 'Chantier en retard',
    })
    .returning()

  const [quoteRow] = await db
    .insert(quote)
    .values({
      projectId: projectRow.id,
      companyId,
      number: `D2026-${randomUUID().slice(0, 8)}`,
      status: 'signed',
      committedLeadTimeDays: 5,
      publicToken: randomUUID(),
      signedAt: daysAgo(40),
      completedAt: daysAgo(1),
      completionSource: 'invoiced',
      totalExclTax: 91000,
      totalTax: 9700,
      totalInclTax: 100700,
    })
    .returning()

  return { companyId, quoteId: quoteRow.id, customerEmail, customerName }
}
