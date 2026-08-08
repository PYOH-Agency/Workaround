import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { format } from '@/domain/money'
import { computeTotals } from '@/domain/quote-totals'
import { outstanding, paymentStatus, type PaymentStatus } from '@/domain/payment-status'
import { TYPE_LABELS } from '@/pdf/invoice-pdf'
import { PaymentForm } from './PaymentForm'
import { CreditNoteButton } from './CreditNoteButton'

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'En attente de règlement',
  partially_paid: 'Partiellement réglée',
  paid: 'Réglée',
  overdue: 'En retard',
}

const METHOD_LABELS = {
  transfer: 'Virement',
  check: 'Chèque',
  cash: 'Espèces',
  card: 'Carte',
  other: 'Autre',
} as const

const formatRate = (rate: number) => `${(rate / 100).toFixed(1).replace('.', ',')} %`

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const found = await db.query.invoice.findFirst({
    where: and(eq(invoice.id, id), eq(invoice.companyId, session.companyId)),
    with: {
      lines: true,
      payments: true,
      quote: true,
      project: { with: { customer: true, property: true } },
    },
  })

  if (!found) notFound()

  const lines = [...found.lines].sort((a, b) => a.position - b.position)
  const { byRate } = computeTotals(found.lines)
  const received = found.payments.map((p) => p.amount)
  const due = outstanding(found.totalInclTax, received)
  const status = paymentStatus(found.totalInclTax, received, found.dueAt, new Date())

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {TYPE_LABELS[found.type]} <span data-testid="numero-facture">{found.number}</span>
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Émise le {found.issuedAt.toLocaleDateString('fr-FR')} · Échéance le{' '}
            {found.dueAt.toLocaleDateString('fr-FR')}
          </p>
          <p className="text-sm opacity-70">{found.project.customer.name}</p>
        </div>
        <span
          data-testid="statut-reglement"
          className="rounded-full border border-black/15 px-3 py-1 text-sm dark:border-white/20"
        >
          {STATUS_LABELS[status]}
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
          <span>{format(found.totalExclTax)}</span>
        </div>
        {byRate.map((b) => (
          <div key={b.rate} className="flex justify-between opacity-70">
            <span>
              TVA {formatRate(b.rate)} sur {format(b.baseExclTax)}
            </span>
            <span>{format(b.taxAmount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/15">
          <span>Total TTC</span>
          <span data-testid="total-ttc">{format(found.totalInclTax)}</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold">
          <span>Reste dû</span>
          <span data-testid="reste-du">{format(due)}</span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Encaissements</h2>
        {found.payments.length === 0 ? (
          <p className="text-sm opacity-70">Aucun encaissement enregistré.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 text-sm dark:divide-white/10">
            {[...found.payments]
              .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
              .map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-2">
                  <span>{p.receivedAt.toLocaleDateString('fr-FR')}</span>
                  <span className="opacity-70">{METHOD_LABELS[p.method]}</span>
                  <span className="flex-1 truncate opacity-70">{p.reference}</span>
                  <span>{format(p.amount)} €</span>
                </li>
              ))}
          </ul>
        )}

        {due > 0 && <PaymentForm invoiceId={found.id} />}
      </section>

      <p className="text-sm">
        Lien du client :{' '}
        <a href={`/f/${found.publicToken}`} data-testid="lien-public" className="underline">
          /f/{found.publicToken}
        </a>
      </p>

      {/* Une facture emise ne se modifie jamais : l'avoir est le seul recours. */}
      {found.type !== 'credit_note' && <CreditNoteButton invoiceId={found.id} />}

      <div className="flex gap-4 text-sm underline opacity-70">
        <Link href="/factures">Retour aux factures</Link>
        {found.quoteId && <Link href={`/devis/${found.quoteId}`}>Retour au devis</Link>}
      </div>
    </main>
  )
}
