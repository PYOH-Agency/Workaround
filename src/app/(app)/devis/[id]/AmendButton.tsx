'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { amendQuote, type AmendState } from './actions'

/**
 * La creation d'un avenant demande une confirmation.
 *
 * Elle n'est pas decorative : un artisan qui croit modifier son devis et
 * decouvre qu'il doit le refaire signer se retournerait contre l'outil. Le
 * texte dit donc ce qui va se passer, avant que ca se passe.
 */
export function AmendButton({ quoteId }: { quoteId: string }) {
  const [state, setState] = useState<AmendState>({})
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <div className="self-start">
          <Button tone="secondary" onClick={() => setConfirming(true)}>
            Créer un avenant
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
    <Card elevation="e1">
      <div className="flex flex-col gap-4">
        <Text>
          Un avenant crée une nouvelle version de ce devis, que votre client devra signer.{' '}
          <strong>Le devis actuel reste en vigueur jusqu’à cette signature.</strong>
        </Text>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            pending={pending}
            onClick={() => startTransition(async () => setState(await amendQuote(quoteId, {})))}
          >
            {pending ? 'Création…' : 'Confirmer l’avenant'}
          </Button>
          <Button tone="secondary" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </div>
      </div>
    </Card>
  )
}
