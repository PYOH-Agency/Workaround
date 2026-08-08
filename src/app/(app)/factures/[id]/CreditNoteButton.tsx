'use client'

import { useState, useTransition } from 'react'
import { issueCreditNote, type InvoiceFormState } from '../actions'

/**
 * L'avoir demande une confirmation : il consomme un numero de la sequence et
 * ne s'annule pas. Une facture emise etant immuable, c'est le seul recours —
 * mais c'est un acte comptable, pas un bouton d'annulation.
 */
export function CreditNoteButton({ invoiceId }: { invoiceId: string }) {
  const [state, setState] = useState<InvoiceFormState>({})
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-black/15 p-4 text-sm dark:border-white/20">
          <span>Émettre un avoir annulant cette facture ?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => setState(await issueCreditNote(invoiceId, {})))}
            className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
          >
            {pending ? 'Émission…' : 'Confirmer l’avoir'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="underline opacity-70">
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start text-sm underline opacity-70"
        >
          Émettre un avoir
        </button>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  )
}
