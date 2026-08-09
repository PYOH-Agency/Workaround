'use client'

import { useActionState } from 'react'
import { MAX_REASON_LENGTH } from '@/domain/dispute'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { disputeLeadTime, type DisputeState } from './actions'

const initialState: DisputeState = {}

/**
 * Contester la mesure du delai.
 *
 * Le texte dit les trois choses que l'artisan doit savoir avant de cliquer :
 * **c'est son client qui tranchera**, le chantier sort du calcul le temps qu'il
 * reponde, et **le silence ne lui profite pas**. Les taire ferait de la
 * contestation un bouton qu'on presse par reflexe.
 */
export function DisputeButton({ quoteId }: { quoteId: string }) {
  const [state, action, pending] = useActionState(
    disputeLeadTime.bind(null, quoteId),
    initialState,
  )

  return (
    <Card elevation="e1">
      <form action={action} className="flex flex-col gap-4">
        <Text size="label" tone="muted">
          Contester la mesure du délai
        </Text>

        <Text size="sm" tone="soft">
          Ce chantier a dépassé le délai que vous aviez engagé. Si le retard ne vous est pas
          imputable, expliquez-le : <strong>votre client sera le seul à trancher.</strong> Le
          chantier sort du calcul le temps qu’il réponde.{' '}
          <strong>S’il ne répond pas sous quatorze jours, la mesure initiale s’applique.</strong>
        </Text>

        <Field
          label="Ce qui s’est passé"
          required
          help={`${MAX_REASON_LENGTH} caractères maximum. Votre client lira ce texte.`}
          error={state.error}
        >
          {(p) => (
            <Textarea
              {...p}
              name="reason"
              rows={3}
              maxLength={MAX_REASON_LENGTH}
              data-testid="motif-contestation"
            />
          )}
        </Field>

        <div>
          <Button type="submit" tone="secondary" pending={pending}>
            {pending ? 'Envoi…' : 'Contester cette mesure'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
