'use client'

import { useState, useTransition } from 'react'
import { issueBalance, issueDeposit, issueProgress, type InvoiceFormState } from '@/actions/invoices'

const field = 'rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20'

/**
 * Emission depuis un devis signe.
 *
 * Le solde n'a pas de champ de saisie : il vaut exactement ce qui reste. Un
 * montant libre garantirait des ecarts avec le devis, or l'ecart devis/facture
 * est la metrique reine du passeport.
 */
export function InvoiceActions({ quoteId, remaining }: { quoteId: string; remaining: string }) {
  const [state, setState] = useState<InvoiceFormState>({})
  const [percent, setPercent] = useState('30')
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<InvoiceFormState>) =>
    startTransition(async () => setState(await action()))

  const share = Number(percent)
  const invalidShare = !Number.isFinite(share) || share <= 0 || share > 100

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-black/10 p-5 dark:border-white/15">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Facturer</h2>
        <p className="text-sm opacity-70">
          Reste à facturer : <span data-testid="reste-a-facturer">{remaining}</span> €
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Pourcentage
          <input
            inputMode="numeric"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className={`${field} w-24`}
          />
        </label>

        <button
          type="button"
          disabled={pending || invalidShare}
          onClick={() => run(() => issueDeposit(quoteId, share, {}))}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          Facture d’acompte
        </button>

        <button
          type="button"
          disabled={pending || invalidShare}
          onClick={() => run(() => issueProgress(quoteId, share, {}))}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
        >
          Situation de travaux
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => issueBalance(quoteId, {}))}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
        >
          Facture de solde
        </button>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </section>
  )
}
