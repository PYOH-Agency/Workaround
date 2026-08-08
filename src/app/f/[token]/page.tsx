import { notFound } from 'next/navigation'
import { loadInvoiceByToken } from '@/services/invoice-public'
import { TYPE_LABELS } from '@/pdf/invoice-pdf'
import { format } from '@/domain/money'

const formatRate = (rate: number) => `${(rate / 100).toFixed(1).replace('.', ',')} %`

const STATUS_LABELS = {
  unpaid: 'En attente de règlement',
  partially_paid: 'Partiellement réglée',
  paid: 'Réglée',
  overdue: 'En retard',
} as const

/**
 * Vue publique d'une facture, accessible sans compte.
 *
 * Le jeton fait office d'autorisation, comme pour le devis. Aucune action n'est
 * possible ici : une facture ne se signe pas, elle se paie.
 */
export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const found = await loadInvoiceByToken(token)

  if (!found) notFound()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {TYPE_LABELS[found.type]} <span data-testid="numero-facture">{found.number}</span>
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Émise le {found.issuedOn} · Échéance le {found.dueOn}
          </p>
        </div>
        <a
          href={`/f/${token}/pdf`}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
        >
          Télécharger le PDF
        </a>
      </header>

      <section className="grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="font-medium">{found.company.legalName}</h2>
          <p className="opacity-70">SIRET {found.company.siret}</p>
          <p className="opacity-70">{found.company.address}</p>
        </div>
        <div>
          <h2 className="font-medium">{found.customer.name}</h2>
          {found.customer.siret && <p className="opacity-70">SIRET {found.customer.siret}</p>}
          <p className="opacity-70">Chantier : {found.customer.propertyAddress}</p>
        </div>
      </section>

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
          {found.lines.map((line, i) => (
            <tr key={i} className="border-b border-black/5 dark:border-white/10">
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
          <span>{format(found.totals.totalExclTax)}</span>
        </div>
        {found.totals.byRate.map((b) => (
          <div key={b.rate} className="flex justify-between opacity-70">
            <span>
              TVA {formatRate(b.rate)} sur {format(b.baseExclTax)}
            </span>
            <span>{format(b.taxAmount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/15">
          <span>Total TTC</span>
          <span data-testid="total-ttc">{format(found.totals.totalInclTax)}</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold">
          <span>Reste dû</span>
          <span data-testid="reste-du">{format(found.outstandingInclTax)}</span>
        </div>
      </div>

      <p data-testid="statut-reglement" className="text-sm opacity-80">
        {STATUS_LABELS[found.status]}
      </p>

      <section className="flex flex-col gap-1 text-sm opacity-80">
        <p>Modalités de paiement : {found.company.legal.paymentTerms}</p>
      </section>

      {/*
        Mentions dues entre professionnels : art. L441-9 et D441-5 du Code de
        commerce. Chaque mention manquante coute 15 EUR, plafonnees a 25 % du
        montant de la facture.
      */}
      {!found.customer.isIndividual && (
        <section className="rounded-lg border border-black/15 p-4 text-sm dark:border-white/20">
          <p className="font-medium">Retard de paiement</p>
          <p className="mt-1 opacity-80">
            En cas de retard de paiement, des pénalités au taux de {found.latePaymentRate} sont
            exigibles dès le jour suivant la date d’échéance, sans qu’un rappel soit nécessaire,
            ainsi qu’une indemnité forfaitaire pour frais de recouvrement de{' '}
            {format(found.recoveryIndemnity)} €.
          </p>
        </section>
      )}

      <section className="border-t border-black/10 pt-4 text-xs opacity-70 dark:border-white/15">
        <p>
          {found.company.legalName} — {found.company.legal.legalFormLabel} ·{' '}
          {found.company.legal.registrationNumber}
        </p>
        <p>
          SIRET {found.company.siret} ·{' '}
          {found.company.legal.vatExempt
            ? 'TVA non applicable, art. 293 B du CGI'
            : `TVA ${found.company.legal.vatNumber}`}
        </p>
        <p>
          {found.company.legal.phone} · {found.company.legal.email}
        </p>
        <p className="mt-2 font-medium">Assurance professionnelle</p>
        <p>
          {found.company.legal.insurerName} — {found.company.legal.insurerAddress}
        </p>
        <p>Contrat n° {found.company.legal.policyNumber}</p>
        <p>Activités garanties : {found.company.legal.coveredActivities}</p>
        <p>Couverture géographique : {found.company.legal.coverageArea}</p>
      </section>
    </main>
  )
}
