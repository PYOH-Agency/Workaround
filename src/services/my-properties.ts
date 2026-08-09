import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, project, property, quote, signature } from '@/db/schema'

export interface MyChantier {
  quoteId: string
  number: string
  companyName: string
  signedAt: Date
  completedAt: Date | null
}

export interface MyProperty {
  id: string
  address: string
  chantiers: MyChantier[]
}

/**
 * Les logements du demandeur, deduits des devis QU'IL A SIGNES.
 *
 * **Jamais de ce qui est arrive a l'adresse.** Le logement est partage par
 * empreinte d'adresse et ne dit rien de qui l'habite : fonder la vue sur
 * l'adresse livrerait au nouvel acquereur d'un appartement le dossier de
 * travaux du precedent proprietaire.
 *
 * La promesse tient quand meme : sur une renovation, le demandeur a signe les
 * trois devis, donc il voit les trois chantiers la ou chaque artisan n'en voit
 * qu'un. **Il reste le seul acteur de la chaine a posseder la vue
 * consolidee** — sans qu'un demenagement transfere un dossier avec les murs.
 */
export async function myProperties(requesterId: string): Promise<MyProperty[]> {
  const rows = await db
    .select({
      propertyId: property.id,
      addressLine1: property.addressLine1,
      postalCode: property.postalCode,
      city: property.city,
      quoteId: quote.id,
      number: quote.number,
      companyName: company.legalName,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(project, eq(project.id, quote.projectId))
    .innerJoin(property, eq(property.id, project.propertyId))
    .innerJoin(company, eq(company.id, quote.companyId))
    // L'exclusion est portee par la REQUETE, jamais par un filtre d'affichage :
    // un ecran qui l'oublierait publierait le chantier d'un tiers.
    .where(eq(signature.requesterId, requesterId))

  const grouped = new Map<string, MyProperty>()

  for (const row of rows) {
    const existing = grouped.get(row.propertyId) ?? {
      id: row.propertyId,
      address: `${row.addressLine1}, ${row.postalCode} ${row.city}`,
      chantiers: [],
    }

    existing.chantiers.push({
      quoteId: row.quoteId,
      number: row.number,
      companyName: row.companyName,
      signedAt: row.signedAt!,
      completedAt: row.completedAt,
    })

    grouped.set(row.propertyId, existing)
  }

  // Le plus recent d'abord, dans chaque logement comme entre logements.
  for (const entry of grouped.values()) {
    entry.chantiers.sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime())
  }

  return [...grouped.values()].sort(
    (a, b) => b.chantiers[0].signedAt.getTime() - a.chantiers[0].signedAt.getTime(),
  )
}
