'use client'

import { useState, useTransition } from 'react'
import { issueCreditNote, type InvoiceFormState } from '@/actions/invoices'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'

/**
 * L'avoir demande une confirmation : il consomme un numero de la sequence et
 * ne s'annule pas. Une facture emise etant immuable, c'est le seul recours —
 * mais c'est un acte comptable, pas un bouton d'annulation.
 *
 * D'ou le ton `danger-solid` sur la confirmation : c'est la seule action de
 * l'ecran qui soit irreversible, et elle doit se distinguer au premier regard
 * du primaire en encre.
 */
export function CreditNoteButton({ invoiceId }: { invoiceId: string }) {
  const [state, setState] = useState<InvoiceFormState>({})
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-3">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-danger bg-danger-bg p-4">
          <Text size="sm" as="span">
            Émettre un avoir annulant cette facture ?
          </Text>
          <Button
            tone="danger-solid"
            pending={pending}
            onClick={() =>
              startTransition(async () => setState(await issueCreditNote(invoiceId, {})))
            }
          >
            {pending ? 'Émission…' : 'Confirmer l’avoir'}
          </Button>
          <Button tone="ghost" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <div className="self-start">
          <Button tone="danger" onClick={() => setConfirming(true)}>
            Émettre un avoir
          </Button>
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}
    </div>
  )
}
