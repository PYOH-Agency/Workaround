'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Notice } from '@/ui/molecules/notice'
import { requestProAction, type ProRequestState } from './actions'

const initialState: ProRequestState = {}

/**
 * Demander l'activation, sans rien promettre de plus que ce qui va se passer.
 *
 * Le succès ne dit pas « bienvenue chez Pro » : l'activation est un geste
 * humain du backoffice. Il dit que la demande est partie — l'écran reste
 * honnête sur ce que l'artisan a, et ce qu'il attend.
 */
export function RequestProButton() {
  const [state, action, pending] = useActionState(requestProAction, initialState)

  if (state.sent) {
    return (
      <Notice tone="verified">
        <Text as="span" size="sm">
          Votre demande est partie. Nous activons votre offre Pro et vous préviendrons — rien à
          régler à cette étape.
        </Text>
      </Notice>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="self-start">
        <Button type="submit" tone="conversion" pending={pending}>
          {pending ? 'Envoi…' : 'Demander l’activation'}
        </Button>
      </div>
      {state.error && (
        <Notice tone="danger" alert>
          {state.error}
        </Notice>
      )}
    </form>
  )
}
