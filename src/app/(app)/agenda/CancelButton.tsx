'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { cancel, type CancelState } from './actions'

/**
 * Annuler demande une confirmation.
 *
 * Elle n'est pas decorative : un clic malheureux sur un chantier, avec des
 * gants, ferait manquer un rendez-vous que le client attend. Meme motif que la
 * confirmation d'avenant, et meme forme.
 */
export function CancelButton({ appointmentId }: { appointmentId: string }) {
  const [state, setState] = useState<CancelState>({})
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <div className="self-start">
          <Button tone="danger" onClick={() => setConfirming(true)}>
            Annuler
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
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Text size="sm" tone="soft">
        Ce rendez-vous quittera votre semaine. <strong>Prévenez votre client.</strong>
      </Text>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          tone="danger-solid"
          pending={pending}
          onClick={() =>
            startTransition(async () => setState(await cancel(appointmentId, {})))
          }
        >
          {pending ? 'Annulation…' : 'Confirmer l’annulation'}
        </Button>
        <Button tone="secondary" onClick={() => setConfirming(false)}>
          Garder le rendez-vous
        </Button>
      </div>
    </div>
  )
}
