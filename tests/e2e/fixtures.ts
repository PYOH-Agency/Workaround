import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { load, userIdFor } from './fixtures-db'

/**
 * Amene un artisan deja connecte a l'etat « devis signe », sans passer par
 * l'interface.
 *
 * Ce raccourci est deliberé : le parcours devis → signature est deja couvert de
 * bout en bout par quote-journey.spec.ts, avec ses appels reels a l'annuaire des
 * entreprises et a l'autorite d'horodatage. Le rejouer ici n'ajouterait aucune
 * garantie et doublerait la duree du test, alors que ce qui reste a prouver
 * commence apres la signature.
 *
 * Le devis porte deux taux de TVA : un acompte sur devis mono-taux ne
 * revelerait jamais une erreur de ventilation.
 */
export async function signedQuoteFor(email: string) {
  const { db, schema } = await load()
  const { company, customer, member, project, property, quote, quoteLine } = schema

  const [user] = await db.execute<{ id: string }>(
    sql`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`,
  )
  if (!user) throw new Error(`Aucun compte Supabase pour ${email} — la connexion a-t-elle abouti ?`)

  const [companyRow] = await db
    .insert(company)
    .values({
      siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
      legalName: 'PLOMBERIE DU PARCOURS',
      addressLine1: '5 cours de l’Intendance',
      postalCode: '33000',
      city: 'Bordeaux',
      // Mentions completes : sans elles, toute emission de facture est refusee.
      legalFormLabel: 'SAS',
      registrationNumber: 'RCS Bordeaux 000 000 000',
      phone: '0556000000',
      email: 'contact@parcours.local',
      vatNumber: 'FR00000000000',
      paymentTerms: 'Solde à réception des travaux.',
      insurerName: 'SMABTP',
      insurerAddress: '114 avenue Émile Zola, 75015 Paris',
      policyNumber: 'D-2026-000999',
      coveredActivities: 'Plomberie, chauffage',
      coverageArea: 'France métropolitaine',
    })
    .returning()

  await db.insert(member).values({
    companyId: companyRow.id,
    userId: user.id,
    email,
    role: 'owner',
  })

  const [customerRow] = await db
    .insert(customer)
    .values({ companyId: companyRow.id, name: 'Paul Martin', email: 'client-m2@test.local' })
    .returning()

  const [propertyRow] = await db
    .insert(property)
    .values({
      fingerprint: randomUUID(),
      addressLine1: '12 rue Fondaudège',
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
      label: 'Remplacement chauffe-eau',
    })
    .returning()

  // 850,00 a 10 % et 60,00 a 20 % : 910,00 HT, 1 007,00 TTC.
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
      sentAt: new Date(),
      signedAt: new Date(),
    })
    .returning()

  await db.insert(quoteLine).values([
    {
      quoteId: quoteRow.id,
      position: 0,
      label: 'Chauffe-eau 200 L posé',
      quantity: '1',
      unitPriceExclTax: 85000,
      taxRate: 1000,
    },
    {
      quoteId: quoteRow.id,
      position: 1,
      label: 'Déplacement',
      quantity: '1',
      unitPriceExclTax: 6000,
      taxRate: 2000,
    },
  ])

  return quoteRow
}


/**
 * Cree l'entreprise de l'artisan connecte et lui declare des activites.
 *
 * Les mentions legales sont completes : sans elles, l'entreprise serait bloquee
 * pour une raison qui n'est pas celle que le parcours verifie.
 */
export async function companyWithActivities(email: string, codes: string[]) {
  const { db, schema } = await load()
  const userId = await userIdFor(email)

  const siren = String(500000000 + Math.floor(Number(userId.replace(/\D/g, '').slice(0, 6)) % 99999))
  const siret = `${siren}00019`

  const [row] = await db
    .insert(schema.company)
    .values({
      siret,
      legalName: 'PLOMBERIE DU PARCOURS',
      addressLine1: '5 cours de l’Intendance',
      postalCode: '33000',
      city: 'Bordeaux',
      legalFormLabel: 'SAS',
      registrationNumber: 'RCS Bordeaux 000 000 000',
      phone: '0556000000',
      email: 'contact@parcours.local',
      vatNumber: 'FR00000000000',
      paymentTerms: 'Solde à réception des travaux.',
      insurerName: 'SMABTP',
      insurerAddress: '114 avenue Émile Zola, 75015 Paris',
      policyNumber: 'D-2026-000999',
      coveredActivities: 'Plomberie, chauffage',
      coverageArea: 'France métropolitaine',
    })
    .returning()

  await db.insert(schema.member).values({ companyId: row.id, userId, email, role: 'owner' })

  await db
    .insert(schema.companyActivity)
    .values(codes.map((activityCode) => ({ companyId: row.id, activityCode })))

  const slug = `${row.legalName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${siren}`
  return { id: row.id, siret, slug }
}

/**
 * Fait du compte connecte un relecteur interne.
 *
 * `staff` est volontairement distinct de `member` : confondre les deux
 * donnerait a un artisan le pouvoir de valider sa propre attestation.
 */
export async function makeStaff(email: string) {
  const { db, schema } = await load()
  await db.insert(schema.staff).values({ userId: await userIdFor(email), email })
}
