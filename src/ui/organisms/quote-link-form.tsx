'use client'

import { useActionState } from 'react'
import { requestQuoteLink, type QuoteLinkState } from '@/actions/public'
import { QUOTE_LINK_CONFIRMATION } from '@/actions/public-messages'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'

const initialState: QuoteLinkState = {}

/**
 * Action **secondaire** de la page demandeur : bouton contour, jamais en
 * terre cuite. La verification reste l'action principale.
 */
export function QuoteLinkForm() {
  const [state, action, pending] = useActionState(requestQuoteLink, initialState)

  if (state.sent) {
    return (
      <div
        role="status"
        className="flex max-w-md items-center gap-3 rounded-card border border-verified bg-verified-bg px-5 py-4 text-verified"
      >
        <Icon name="check" />
        <Text as="span">{QUOTE_LINK_CONFIRMATION}</Text>
      </div>
    )
  }

  return (
    <form action={action} className="flex max-w-md flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1">
        <Field label="Votre adresse e-mail" error={state.error} required>
          {(p) => <Input {...p} name="email" type="email" autoComplete="email" />}
        </Field>
      </div>
      <Button type="submit" tone="secondary" size="lg" pending={pending}>
        Recevoir le lien
      </Button>
    </form>
  )
}
