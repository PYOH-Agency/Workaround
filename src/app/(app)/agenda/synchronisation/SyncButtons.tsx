'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import type { ProviderId } from '@/services/calendar-providers'
import { regenerateFeed, startLink, unlink, type SyncState } from './actions'

const initialState: SyncState = {}

/**
 * Régénérer l'adresse d'abonnement.
 *
 * Confirmation en deux temps : l'ancienne cesse de répondre aussitôt, et un
 * artisan qui l'a collée dans trois appareils devra les reprendre.
 */
export function RegenerateButton() {
  const [state, action, pending] = useActionState(regenerateFeed, initialState)

  return (
    <form action={action} className="flex flex-col gap-2">
      <Button type="submit" tone="secondary" pending={pending}>
        {pending ? 'Régénération…' : 'Régénérer l’adresse'}
      </Button>
      {state.error && (
        <Text size="sm" tone="soft">
          {state.error}
        </Text>
      )}
    </form>
  )
}

export function LinkButton({ provider, label }: { provider: ProviderId; label: string }) {
  const [state, action, pending] = useActionState(startLink.bind(null, provider), initialState)

  return (
    <form action={action} className="flex flex-col gap-2">
      <Button type="submit" tone="secondary" pending={pending}>
        {pending ? 'Ouverture…' : `Raccorder ${label}`}
      </Button>
      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}
    </form>
  )
}

export function UnlinkButton({ provider }: { provider: ProviderId }) {
  const [, action, pending] = useActionState(unlink.bind(null, provider), initialState)

  return (
    <form action={action}>
      <Button type="submit" tone="danger" pending={pending}>
        {pending ? 'Retrait…' : 'Retirer'}
      </Button>
    </form>
  )
}
