'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Checkbox } from '@/ui/atoms/checkbox'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Field } from '@/ui/molecules/field'
import { Notice } from '@/ui/molecules/notice'
import { declareReceptionAction, type ReceptionState } from './actions'

const initialState: ReceptionState = {}

/**
 * La reception, declaree par le maitre d'ouvrage.
 *
 * Le texte dit pourquoi c'est a lui de le faire : la reception suppose qu'il a
 * pris possession de l'ouvrage et qu'il a tout regle. Nous ne pouvons constater
 * ni l'un ni l'autre, et une date fausse lui couterait un delai de forclusion.
 *
 * Il peut recevoir **avec reserves** : la reception a quand meme lieu — les
 * garanties courent — mais il conserve la retenue de garantie jusqu'a leur
 * levee. La case decouvre le champ ; sans elle, la reception est sans reserve.
 */
export function ReceptionForm({
  quoteId,
  current,
  currentReserves,
}: {
  quoteId: string
  current: string
  currentReserves: string | null
}) {
  const [state, action, pending] = useActionState(
    declareReceptionAction.bind(null, quoteId),
    initialState,
  )
  const [withReserves, setWithReserves] = useState(currentReserves !== null)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Field label="Date de réception">
            {(p) => (
              <Input {...p} name="date" type="date" defaultValue={current} data-testid="date-reception" />
            )}
          </Field>
        </div>

        <Button type="submit" tone="secondary" pending={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer la réception'}
        </Button>
      </div>

      <Field label="La réception comporte des réserves" layout="checkbox">
        {(p) => (
          <Checkbox
            {...p}
            name="avec_reserves"
            checked={withReserves}
            onChange={(e) => setWithReserves(e.target.checked)}
          />
        )}
      </Field>

      {withReserves && (
        <Field
          label="Les réserves"
          help="Décrivez les points restant à reprendre. Vous les lèverez une fois corrigés — c’est cette levée qui débloquera la retenue de garantie."
        >
          {(p) => (
            <Textarea
              {...p}
              name="reserves"
              defaultValue={currentReserves ?? ''}
              placeholder="Joint du bac à douche à reprendre, peinture du plafond à retoucher…"
            />
          )}
        </Field>
      )}

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
