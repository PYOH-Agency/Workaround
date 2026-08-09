'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { declareReceptionAction, type ReceptionState } from './actions'

const initialState: ReceptionState = {}

/**
 * La reception, declaree par le maitre d'ouvrage.
 *
 * Le texte dit pourquoi c'est a lui de le faire : la reception suppose qu'il a
 * pris possession de l'ouvrage **sans reserve** et qu'il a tout regle. Nous ne
 * pouvons constater ni l'un ni l'autre, et une date fausse lui couterait un
 * delai de forclusion.
 */
export function ReceptionForm({ quoteId, current }: { quoteId: string; current: string }) {
  const [state, action, pending] = useActionState(
    declareReceptionAction.bind(null, quoteId),
    initialState,
  )

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Field label="Date de réception" error={state.error}>
            {(p) => (
              <Input {...p} name="date" type="date" defaultValue={current} data-testid="date-reception" />
            )}
          </Field>
        </div>

        <Button type="submit" tone="secondary" pending={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer la réception'}
        </Button>
      </div>

      {state.saved && (
        <Text size="sm" tone="soft">
          Enregistré.
        </Text>
      )}
    </form>
  )
}
