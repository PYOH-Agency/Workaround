'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'
import { Link as UiLink } from '@/ui/atoms/link'
import { sendQuote, type SendState } from './envoyer/actions'

export function SendButton({ quoteId }: { quoteId: string }) {
  const [state, setState] = useState<SendState>({})
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-3">
      <div className="self-start">
        <Button
          size="lg"
          pending={pending}
          onClick={() => startTransition(async () => setState(await sendQuote(quoteId, {})))}
        >
          {pending ? (
            'Envoi…'
          ) : (
            <>
              <Icon name="send" size="sm" />
              Envoyer au client
            </>
          )}
        </Button>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}

      {state.link && (
        <div
          role="status"
          className="rounded-card border border-verified bg-verified-bg px-4 py-3 text-sm text-verified"
        >
          Envoyé. Lien du client :{' '}
          <span data-testid="lien-public">
            <UiLink href={state.link}>{state.link}</UiLink>
          </span>
        </div>
      )}
    </div>
  )
}

/*
 * `data-testid` enveloppe le lien au lieu d'etre pose dessus : `UiLink` decide
 * lui-meme s'il rend un `<a>` ou un `next/link`, et n'accepte volontairement pas
 * d'attribut arbitraire. Le test cible donc le conteneur, ce qui lui suffit — il
 * verifie la visibilite, pas le href.
 */
