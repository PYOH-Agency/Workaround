import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, project, quote } from '@/db/schema'
import { medianQuoteLeadTime, type MedianDays } from '@/domain/quote-lead-time'

/**
 * Le delai de remise du devis d'une entreprise.
 *
 * Un chantier compte quand il porte **une visite et un devis envoye**. Les
 * autres sont ecartes par la REQUETE, jamais par un filtre d'affichage — comme
 * partout ailleurs.
 *
 * Un rendez-vous **annule compte quand meme** s'il a precede le devis : la
 * visite a eu lieu, c'est le rendez-vous qui a ete retire de l'agenda ensuite.
 * L'exclure ferait disparaitre des mesures valides, et ferait de l'annulation
 * un effaceur.
 */
export async function companyQuoteLeadTime(companyId: string, now: Date): Promise<MedianDays> {
  const rows = await db
    .select({
      visitAt: sql<Date>`MIN(${appointment.startsAt})`,
      visitCreatedAt: sql<Date>`MIN(${appointment.createdAt})`,
      quoteSentAt: sql<Date>`MIN(${quote.sentAt})`,
    })
    .from(project)
    .innerJoin(
      appointment,
      and(eq(appointment.projectId, project.id), eq(appointment.kind, 'visit')),
    )
    .innerJoin(quote, and(eq(quote.projectId, project.id), isNotNull(quote.sentAt)))
    .where(eq(project.companyId, companyId))
    .groupBy(project.id)

  return medianQuoteLeadTime(
    rows.map((row) => ({
      visitAt: new Date(row.visitAt),
      visitCreatedAt: new Date(row.visitCreatedAt),
      quoteSentAt: new Date(row.quoteSentAt),
    })),
    now,
  )
}
