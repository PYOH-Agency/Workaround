import Link from 'next/link'
import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, project, quote } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { format } from '@/domain/money'

export default async function QuotesPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const [myCompany] = await db.select().from(company).where(eq(company.id, session.companyId))

  const quotes = await db
    .select({
      id: quote.id,
      number: quote.number,
      totalInclTax: quote.totalInclTax,
      label: project.label,
    })
    .from(quote)
    .innerJoin(project, eq(quote.projectId, project.id))
    .where(eq(quote.companyId, session.companyId))
    .orderBy(desc(quote.createdAt))

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">{myCompany.legalName}</h1>
        <p className="mt-1 text-sm opacity-70">
          SIRET {myCompany.siret} · {myCompany.city}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Vos devis</h2>
          <Link
            href="/devis/nouveau"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Créer un devis
          </Link>
        </div>

        {quotes.length === 0 ? (
          <p className="text-sm opacity-70">Aucun devis pour l’instant.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/devis/${q.id}`} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="font-mono">{q.number}</span>
                  <span className="flex-1 truncate opacity-70">{q.label}</span>
                  <span>{format(q.totalInclTax)} €</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
