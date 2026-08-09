'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { completeChantier, type CompleteState } from './actions'

const initialState: CompleteState = {}

/**
 * Marquer un chantier termine.
 *
 * La confirmation dit ce que le geste declenche : sans elle, l'artisan
 * decouvrirait apres coup que son delai engage vient d'etre compare a cette
 * date. La date est saisissable — un chantier fini vendredi et declare lundi
 * ne doit pas couter deux jours.
 */
export function CompleteButton({ quoteId, today }: { quoteId: string; today: string }) {
  const [state, action, pending] = useActionState(
    completeChantier.bind(null, quoteId),
    initialState,
  )

  return (
    <Card elevation="e1">
      <form action={action} className="flex flex-col gap-4">
        <Text size="label" tone="muted">
          Chantier terminé
        </Text>

        <Text size="sm" tone="soft">
          Marquer ce chantier terminé alimente votre passeport : le délai que vous aviez engagé
          sera comparé à cette date. <strong>Émettre la facture de solde la mettra à jour
          automatiquement.</strong>
        </Text>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Field label="Date de fin" required>
              {(p) => <Input {...p} name="date" type="date" defaultValue={today} />}
            </Field>
          </div>

          <Button type="submit" tone="secondary" pending={pending}>
            {pending ? 'Enregistrement…' : 'Marquer terminé'}
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
      </form>
    </Card>
  )
}
