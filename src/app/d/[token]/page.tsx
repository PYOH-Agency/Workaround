import { notFound } from 'next/navigation'
import { loadQuoteByToken } from '@/services/quote-public'
import { format } from '@/domain/money'
import { SignatureBlock } from './SignatureBlock'

/** On ne reaffiche jamais le numero en entier : la page est publique. */
const maskPhone = (phone: string) => `${phone.slice(0, 2)} •• •• •• ${phone.slice(-2)}`

/**
 * Vue publique d'un devis, accessible sans compte.
 *
 * Le jeton fait office d'autorisation : le demandeur n'a pas de compte en M1.
 */
const formatRate = (rate: number) => `${(rate / 100).toFixed(1).replace('.', ',')} %`

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await loadQuoteByToken(token)

  if (!found) notFound()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Devis {found.number}</h1>
          <p className="mt-1 text-sm opacity-70">Émis le {found.issuedOn}</p>
        </div>
        <a
          href={`/d/${token}/pdf`}
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
      </div>

      {found.committedLeadTimeDays !== null && (
        <p className="text-sm opacity-70">
          Délai d’exécution engagé : {found.committedLeadTimeDays} jours ouvrés à compter de
          l’acceptation.
        </p>
      )}

      <section className="border-t border-black/10 pt-4 text-xs opacity-70 dark:border-white/15">
        <p className="font-medium">Assurance professionnelle</p>
        <p>
          {found.company.insurance.insurerName} — {found.company.insurance.insurerAddress}
        </p>
        <p>Contrat n° {found.company.insurance.policyNumber}</p>
        <p>Activités garanties : {found.company.insurance.coveredActivities}</p>
        <p>Couverture géographique : {found.company.insurance.coverageArea}</p>
      </section>

      {found.status === 'signed' ? (
        <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
          Devis signé.
        </p>
      ) : found.status === 'sent' && found.customer.phone ? (
        <SignatureBlock token={token} phoneHint={maskPhone(found.customer.phone)} />
      ) : null}
    </main>
  )
}
