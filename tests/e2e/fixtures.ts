import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'

// Meme garde que pour les tests unitaires : on n'attaque que la pile locale.
config({ path: '.env.test' })

/**
 * Chargement differe du client de base.
 *
 * `@/db/client` lit `DATABASE_URL` a l'evaluation du module. Un import statique
 * serait hisse au-dessus du `config()` ci-dessus et ouvrirait la connexion sur
 * une variable absente.
 */
async function load() {
  const [{ db }, imported] = await Promise.all([import('@/db/client'), import('@/db/schema')])

  // Playwright transpile ses fichiers en CommonJS. Un module qui ne fait que
  // reexporter (`export *`) ne laisse alors rien deviner statiquement, et ses
  // exports se retrouvent sous `default` au lieu d'etre a plat.
  const schema = (imported.default ?? imported) as unknown as typeof import('@/db/schema')

  return { db, schema }
}

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
