'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Field } from '@/ui/molecules/field'
import { sendRepeatContact, type RepeatContactState } from './actions'

const initialState: RepeatContactState = {}

/**
 * Recontacter une entreprise deja employee.
 *
 * Ni nom ni adresse a saisir : la session les porte. Ce qui reste a ecrire est
 * le besoin, et rien d'autre.
 */
export function ContactForm({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [state, action, pending] = useActionState(
    sendRepeatContact.bind(null, companyId),
    initialState,
  )

  if (state.sent) {
    return (
      <div data-testid="message-envoye">
        <Text tone="soft">
          Votre message est parti. {companyName} répondra directement à votre adresse.
        </Text>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Text size="sm" tone="soft">
        Votre message part directement à {companyName}, qui répondra à votre adresse.{' '}
        <strong>Nous n’en gardons aucune trace.</strong>
      </Text>

      <Field label="Votre message" required error={state.error}>
        {(p) => <Textarea {...p} name="message" rows={4} data-testid="message-reprise" />}
      </Field>

      <div>
        <Button type="submit" tone="secondary" pending={pending}>
          {pending ? 'Envoi…' : 'Envoyer'}
        </Button>
      </div>
    </form>
  )
}
