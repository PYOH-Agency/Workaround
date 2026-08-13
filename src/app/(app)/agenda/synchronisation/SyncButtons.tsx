'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import type { ProviderId } from '@/services/calendar-providers'
import { regenerateFeed, startLink, unlink, type SyncState } from './actions'

const initialState: SyncState = {}

/**
 * Régénérer l'adresse d'abonnement.
 *
 * Confirmation en deux temps : l'ancienne cesse de répondre aussitôt, et un
 * artisan qui l'a collée dans trois appareils devra les reprendre. Le
 * commentaire l'annonçait depuis toujours, mais le bouton régénérait au
 * premier clic — une action destructive sans le garde-fou qu'il décrivait.
 */
export function RegenerateButton() {
  const [state, action, pending] = useActionState(regenerateFeed, initialState)
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <div className="self-start">
          <Button tone="secondary" onClick={() => setConfirming(true)}>
            Régénérer l’adresse
          </Button>
        </div>
        {state.error && (
          <Text size="sm" tone="soft">
            {state.error}
          </Text>
        )}
      </div>
    )
  }

  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-4">
        <Text>
          L’adresse actuelle <strong>cessera aussitôt de répondre</strong>. Si vous l’avez ajoutée à
          plusieurs appareils, chacun devra reprendre la nouvelle.
        </Text>

        <div className="flex flex-wrap items-center gap-3">
          <form action={action}>
            <Button type="submit" tone="danger" pending={pending}>
              {pending ? 'Régénération…' : 'Régénérer l’adresse'}
            </Button>
          </form>
          <Button tone="secondary" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </div>

        {state.error && (
          <Text size="sm" tone="soft">
            {state.error}
          </Text>
        )}
      </div>
    </Card>
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
