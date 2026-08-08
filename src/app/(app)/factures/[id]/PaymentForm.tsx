'use client'

import { useActionState, useState } from 'react'
import { addPayment } from '../actions'
import type { InvoiceFormState } from '@/actions/invoices'

const initialState: InvoiceFormState = {}

const field = 'rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20'

/**
 * Champs controles, pas laisses au DOM.
 *
 * React 19 reinitialise un formulaire non controle apres une action : sur un
 * montant refuse, la saisie disparaissait et la validation HTML bloquait
 * silencieusement toute nouvelle tentative. Le meme piege avait ete rencontre
 * sur la signature en M1.
 *
 * Se vider apres un succes passe donc par un remontage — la cle change a chaque
 * enregistrement — plutot que par un effet qui appellerait `setState` en
 * cascade.
 */
export function PaymentForm({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(addPayment.bind(null, invoiceId), initialState)

  return (
    <form
      key={state.saved ?? 0}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15"
    >
      <PaymentFields error={state.error} pending={pending} />
    </form>
  )
}

function PaymentFields({ error, pending }: { error?: string; pending: boolean }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [reference, setReference] = useState('')

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Montant
          <input
            name="montant"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${field} w-32`}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Moyen
          <select name="moyen" defaultValue="transfer" className={field}>
            <option value="transfer">Virement</option>
            <option value="check">Chèque</option>
            <option value="cash">Espèces</option>
            <option value="card">Carte</option>
            <option value="other">Autre</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Référence
          <input
            name="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={field}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer le paiement'}
      </button>
    </>
  )
}
