import { randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { company, customer, project, property, quote, quoteLine } from '@/db/schema'
import { splitDepositByRate } from '@/domain/invoice-balance'

/**
 * Ces tests n'effacent rien : la facture est immuable par declencheur, et le
 * compteur de sequence survit a la suite.
 *
 * Ils s'isolent donc par entreprise generee, comme le fait deja events.test.ts.
 * S'appuyer sur l'entreprise du jeu de donnees les rendrait dependants d'un
 * `supabase db reset` prealable : le deuxieme `pnpm vitest run` echouerait, avec
 * un compteur deja consomme.
 */

/** Un SIRET unique et syntaxiquement plausible, sans collision entre lancements. */
const someSiret = () => randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14)

/** Une entreprise neuve, aux mentions completes. Rend son identifiant. */
export async function createCompany(): Promise<string> {
  const id = randomUUID()

  await db.insert(company).values({
    id,
    siret: someSiret(),
    legalName: 'Entreprise de test',
    // Mentions completes : sans elles, toute emission est refusee — et le test
    // echouerait pour une raison qui n'est pas celle qu'il verifie.
    legalFormLabel: 'SAS',
    registrationNumber: 'RCS Bordeaux 000 000 000',
    phone: '0556000000',
    email: 'test@local',
    vatNumber: 'FR00000000000',
    paymentTerms: 'Solde à réception',
    insurerName: 'SMABTP',
    insurerAddress: 'Paris',
    policyNumber: 'D-0001',
    coveredActivities: 'Plomberie',
    coverageArea: 'France',
  })

  return id
}

/** Un chantier, avec son client et son logement. Rend son identifiant. */
export async function createProject(companyId: string): Promise<string> {
  const [customerRow] = await db
    .insert(customer)
    .values({ companyId, name: 'Client de test', email: 'client@local' })
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

/**
 * Un devis a deux taux de TVA : 850,00 a 10 % et 60,00 a 20 %.
 * Soit 910,00 HT et 1 007,00 TTC — les memes chiffres que le jeu de donnees.
 *
 * Chaque test fabrique le sien : partager un devis rendrait les tests
 * dependants de leur ordre, et la facture etant immuable, rien ne se nettoie.
 */
export async function signedQuote(
  companyId: string,
  projectId: string,
  status: 'sent' | 'signed' = 'signed',
) {
  const [row] = await db
    .insert(quote)
    .values({
      projectId,
      companyId,
      number: `D2026-${randomUUID().slice(0, 8)}`,
      status,
      totalExclTax: 91000,
      totalTax: 9700,
      totalInclTax: 100700,
      publicToken: randomUUID(),
      signedAt: status === 'signed' ? new Date() : null,
    })
    .returning()

  await db.insert(quoteLine).values([
    {
      quoteId: row.id,
      position: 0,
      label: 'Chauffe-eau posé',
      quantity: '1',
      unitPriceExclTax: 85000,
      taxRate: 1000,
    },
    {
      quoteId: row.id,
      position: 1,
      label: 'Déplacement',
      quantity: '1',
      unitPriceExclTax: 6000,
      taxRate: 2000,
    },
  ])

  return row
}

/** Les lignes d'un acompte de `percent` %, ventilees sur les deux taux du devis. */
export const depositLines = (percent: number) =>
  splitDepositByRate(
    [
      { rate: 1000, baseExclTax: 85000, taxAmount: 8500 },
      { rate: 2000, baseExclTax: 6000, taxAmount: 1200 },
    ],
    percent,
  ).map((line) => ({
    label: `Acompte ${percent} %`,
    unit: 'u',
    quantity: '1',
    unitPriceExclTax: line.unitPriceExclTax,
    taxRate: line.rate,
  }))
