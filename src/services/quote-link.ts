import { and, eq, gt, lt, ne, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, customer, project, quote, quoteLinkRequest } from '@/db/schema'
import { format } from '@/domain/money'
import { isRateLimited } from '@/domain/rate-limit'
import { sendQuoteLink } from './email'

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 3
const RETENTION_MS = 24 * 60 * 60 * 1000

/**
 * Renvoie a une adresse les liens des devis qui lui ont ete adresses.
 *
 * Ne renvoie **jamais** ce qu'elle a trouve : l'appelant ne doit rien pouvoir
 * deduire, sans quoi le formulaire devient un test d'existence d'adresse.
 *
 * Un echec d'envoi pour un devis trouve est avale ici, silencieusement,
 * exactement comme un devis non trouve : le laisser remonter changerait la
 * reponse vue par l'appelant selon qu'une adresse correspond ou non, ce qui
 * est precisement ce que cette fonction doit empecher.
 */
export async function resendQuoteLinks(email: string, now: Date): Promise<void> {
  // L'adresse n'est pas forcement enregistree en minuscules cote client
  // (`createProject` la stocke telle que saisie par l'artisan) : la
  // comparaison se fait donc insensible a la casse, cote base, plutot que de
  // supposer une normalisation qui n'existe pas a l'ecriture.
  const address = email.trim().toLowerCase()

  // Purge a l'ecriture plutot que par tache planifiee : une tache qu'on oublie
  // de surveiller laisse grossir une table de donnees personnelles.
  await db
    .delete(quoteLinkRequest)
    .where(lt(quoteLinkRequest.requestedAt, new Date(now.getTime() - RETENTION_MS)))

  const previous = await db
    .select({ requestedAt: quoteLinkRequest.requestedAt })
    .from(quoteLinkRequest)
    .where(
      and(
        eq(quoteLinkRequest.email, address),
        gt(quoteLinkRequest.requestedAt, new Date(now.getTime() - WINDOW_MS)),
      ),
    )

  await db.insert(quoteLinkRequest).values({ email: address, requestedAt: now })

  if (isRateLimited(previous.map((r) => r.requestedAt), now, WINDOW_MS, MAX_PER_WINDOW)) {
    return
  }

  // Jamais un brouillon : il n'a pas d'adresse publique. Le nom d'entreprise
  // vient de `company`, pas de `project.label` qui est l'intitule du chantier.
  const found = await db
    .select({
      number: quote.number,
      publicToken: quote.publicToken,
      totalInclTax: quote.totalInclTax,
      customerName: customer.name,
      companyName: company.legalName,
    })
    .from(quote)
    .innerJoin(project, eq(quote.projectId, project.id))
    .innerJoin(customer, eq(project.customerId, customer.id))
    .innerJoin(company, eq(quote.companyId, company.id))
    .where(and(eq(sql`lower(${customer.email})`, address), ne(quote.status, 'draft')))

  const base = process.env.APP_URL ?? ''

  for (const row of found) {
    try {
      await sendQuoteLink({
        to: address,
        customerName: row.customerName,
        companyName: row.companyName,
        quoteNumber: row.number,
        totalInclTax: format(row.totalInclTax),
        link: `${base}/d/${row.publicToken}`,
      })
    } catch {
      // Un devis existe mais l'envoi echoue (SMTP en panne) : on avale, on ne
      // remonte pas. Sinon l'appelant verrait une erreur precisement quand une
      // adresse correspond a un devis, ce qui la rendrait detectable.
    }
  }
}
