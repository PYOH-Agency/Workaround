import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { computeTotals } from '@/domain/quote-totals'
import { format } from '@/domain/money'
import { SendButton } from './SendButton'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  signed: 'Signé',
  refused: 'Refusé',
  expired: 'Expiré',
}

const formatRate = (rate: number) => `${(rate / 100).toFixed(1).replace('.', ',')} %`

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) redirect('/connexion')
    throw e
  }

  // Restreint a l'entreprise de la session : l'autorisation vit dans le code,
  // ou elle est lisible et testable.
  const found = await db.query.quote.findFirst({
    where: and(eq(quote.id, id), eq(quote.companyId, session.companyId)),
    with: { lines: true, project: { with: { customer: true, property: true } } },
  })

  if (!found) notFound()

  const totals = computeTotals(found.lines)
  const lines = [...found.lines].sort((a, b) => a.position - b.position)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Devis {found.number}</h1>
          <p className="mt-1 text-sm opacity-70">
            {found.project.label} · {found.project.customer.name}
          </p>
          <p className="text-sm opacity-70">
            {found.project.property.addressLine1}, {found.project.property.postalCode}{' '}
            {found.project.property.city}
          </p>
        </div>
        <span
          data-testid="statut-devis"
          className="rounded-full border border-black/15 px-3 py-1 text-sm dark:border-white/20"
        >
          {STATUS_LABELS[found.status] ?? found.status}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/15 text-left dark:border-white/20">
            <th className="py-2 font-medium">Désignation</th>
            <th className="py-2 text-right font-medium">Qté</th>
            <th className="py-2 text-right font-medium">P.U. HT</th>
            <th className="py-2 text-right font-medium">TVA</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-black/5 dark:border-white/10">
              <td className="py-2">{line.label}</td>
              <td className="py-2 text-right">
                {line.quantity} {line.unit}
              </td>
              <td className="py-2 text-right">{format(line.unitPriceExclTax)}</td>
              <td className="py-2 text-right">{formatRate(line.taxRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rounded-xl border border-black/10 p-5 text-sm dark:border-white/15">
        <div className="flex justify-between">
          <span>Total HT</span>
          <span>{format(totals.totalExclTax)}</span>
        </div>
        {totals.byRate.map((b) => (
          <div key={b.rate} className="flex justify-between opacity-70">
            <span>
              TVA {formatRate(b.rate)} sur {format(b.baseExclTax)}
            </span>
            <span>{format(b.taxAmount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/15">
          <span>Total TTC</span>
          <span data-testid="total-ttc">{format(totals.totalInclTax)}</span>
        </div>
      </div>

      {found.committedLeadTimeDays !== null && (
        <p className="text-sm opacity-70">
          Délai d’exécution engagé : {found.committedLeadTimeDays} jours ouvrés.
        </p>
      )}

      {found.status === 'draft' ? (
        <SendButton quoteId={found.id} />
      ) : (
        <p className="text-sm">
          Lien du client :{' '}
          <a href={`/d/${found.publicToken}`} data-testid="lien-public" className="underline">
            /d/{found.publicToken}
          </a>
        </p>
      )}

      <Link href="/devis" className="text-sm underline opacity-70">
        Retour aux devis
      </Link>
    </main>
  )
}
