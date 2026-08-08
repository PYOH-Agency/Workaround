'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { sendContact, type ContactState } from './actions'

const initialState: ContactState = {}

/**
 * La prise de contact.
 *
 * Elle s'adresse a UNE entreprise, choisie par le demandeur. Rien de ce qu'il
 * saisit n'est conserve : le message part par courriel et disparait. C'est ce
 * qui rend impossible — et non seulement interdite — la constitution d'une base
 * de leads.
 */
export function ContactForm({
  companyId,
  legalName,
}: {
  companyId: string
  legalName: string
}) {
  const [state, action, pending] = useActionState(sendContact, initialState)

  if (state.sent) {
    return (
      <Card elevation="e1">
        <div role="status" className="flex flex-col gap-1">
          <Text>Votre demande est partie.</Text>
          <Text size="sm" tone="soft">
            {legalName} vous répondra directement, par téléphone ou par e-mail. Rien ne vous attend
            ici : nous ne conservons pas votre message.
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <Card elevation="e1">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="entreprise" value={companyId} />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Votre nom" required>
            {(p) => <Input {...p} name="nom" />}
          </Field>
          <Field label="Votre e-mail" required>
            {(p) => <Input {...p} name="email" type="email" />}
          </Field>
          <Field label="Votre téléphone">
            {(p) => <Input {...p} name="telephone" type="tel" />}
          </Field>
        </div>

        <Field label="Votre besoin" help="Quelques mots suffisent." required>
          {(p) => <Textarea {...p} name="message" rows={4} />}
        </Field>

        {state.error && (
          <div
            role="alert"
            className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
          >
            {state.error}
          </div>
        )}

        <div className="self-start">
          <Button type="submit" pending={pending}>
            {pending ? 'Envoi…' : 'Envoyer la demande'}
          </Button>
        </div>

        <Text size="sm" tone="muted">
          Votre message est transmis à <strong>{legalName}</strong>, et à personne d’autre.{' '}
          <strong>Nous ne le conservons pas</strong> : l’entreprise vous répondra directement.{' '}
          <Link href="/confidentialite" newTab>
            Protection des données
          </Link>
        </Text>
      </form>
    </Card>
  )
}
