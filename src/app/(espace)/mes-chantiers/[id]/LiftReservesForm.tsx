'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { Notice } from '@/ui/molecules/notice'
import { liftReservesAction, type ReceptionState } from './actions'

const initialState: ReceptionState = {}

/**
 * La levee des reserves, declaree par le maitre d'ouvrage.
 *
 * Meme logique que la reception : c'est son acte, a la date qu'il constate. Une
 * fois declaree, la retenue de garantie — bloquee tant que les reserves
 * tenaient — se libere au terme normal.
 */
export function LiftReservesForm({ quoteId, min }: { quoteId: string; min: string }) {
  const [state, action, pending] = useActionState(
    liftReservesAction.bind(null, quoteId),
    initialState,
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Field label="Date de levée des réserves">
            {(p) => <Input {...p} name="date" type="date" min={min} data-testid="date-levee" />}
          </Field>
        </div>

        <Button type="submit" tone="secondary" pending={pending}>
          {pending ? 'Enregistrement…' : 'Déclarer la levée'}
        </Button>
      </div>

      {state.error && (
        <Notice tone="danger" alert>
          {state.error}
        </Notice>
      )}

      {state.saved && (
        <Text size="sm" tone="soft">
          Enregistré.
        </Text>
      )}
    </form>
  )
}
