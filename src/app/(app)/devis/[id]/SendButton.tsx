'use client'

import { useState, useTransition } from 'react'
import { sendQuote, type SendState } from './envoyer/actions'

export function SendButton({ quoteId }: { quoteId: string }) {
  const [state, setState] = useState<SendState>({})
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => setState(await sendQuote(quoteId, {})))
        }
        className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Envoi…' : 'Envoyer au client'}
      </button>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state.link && (
        <p role="status" className="text-sm">
          Envoyé. Lien du client :{' '}
          <a href={state.link} data-testid="lien-public" className="underline">
            {state.link}
          </a>
        </p>
      )}
    </div>
  )
}
