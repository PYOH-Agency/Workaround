'use client'

import { useActionState, useState } from 'react'
import type { InvoiceFormState } from '@/actions/invoices'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Field } from '@/ui/molecules/field'
import { addPayment } from '../actions'

const initialState: InvoiceFormState = {}

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
      className="flex flex-col gap-4 rounded-card border border-rule bg-card p-5"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Montant" required>
          {(p) => (
            <Input
              {...p}
              name="montant"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>

        <Field label="Date" required>
          {(p) => (
            <Input
              {...p}
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>

        <Field label="Moyen">
          {(p) => (
            <Select {...p} name="moyen" defaultValue="transfer">
              <option value="transfer">Virement</option>
              <option value="check">Chèque</option>
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
              <option value="other">Autre</option>
            </Select>
          )}
        </Field>

        <Field label="Référence">
          {(p) => (
            <Input
              {...p}
              name="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          )}
        </Field>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </div>
      )}

      <div className="self-start">
        <Button type="submit" pending={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer le paiement'}
        </Button>
      </div>
    </>
  )
}
