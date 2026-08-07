import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { customer, project, property } from '@/db/schema'
import { addressFingerprint, type Address } from '@/domain/address'

export interface NewProject {
  companyId: string
  customer: {
    name: string
    email: string
    phone: string
    type: 'individual' | 'business'
    siret?: string
  }
  address: Address & { line2?: string }
  label: string
}

/**
 * Cree un chantier, et avec lui son client et son logement.
 *
 * Le **logement est partage** entre entreprises : deux artisans intervenant a
 * la meme adresse doivent pointer sur la meme ligne. C'est ce qui rendra
 * possible la vue consolidee du demandeur. Le **client**, lui, appartient a
 * l'entreprise et n'est jamais mutualise.
 */
export async function createProject(input: NewProject) {
  // Le SIRET du client sera exige par la facturation electronique B2B en M2.
  if (input.customer.type === 'business' && !input.customer.siret) {
    throw new Error('Le SIRET est obligatoire pour un client professionnel')
  }

  const fingerprint = addressFingerprint(input.address)

  const existing = await db.query.property.findFirst({
    where: eq(property.fingerprint, fingerprint),
  })

  const [prop] = existing
    ? [existing]
    : await db
        .insert(property)
        .values({
          fingerprint,
          addressLine1: input.address.line1,
          addressLine2: input.address.line2 ?? null,
          postalCode: input.address.postalCode,
          city: input.address.city,
        })
        .returning()

  const [cust] = await db
    .insert(customer)
    .values({
      companyId: input.companyId,
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      type: input.customer.type,
      siret: input.customer.siret ?? null,
    })
    .returning()

  const [proj] = await db
    .insert(project)
    .values({
      companyId: input.companyId,
      customerId: cust.id,
      propertyId: prop.id,
      label: input.label,
    })
    .returning()

  return { project: proj, customer: cust, property: prop }
}
