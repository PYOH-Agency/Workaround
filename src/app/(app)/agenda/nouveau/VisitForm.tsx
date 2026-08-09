'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { bookVisit, type BookVisitState } from './actions'

const initialState: BookVisitState = {}

/**
 * Le rendez-vous de visite.
 *
 * Le texte dit que le geste en fait deux : sans cela, l'artisan chercherait
 * ensuite ou creer son chantier, alors qu'il vient de le creer.
 */
export function VisitForm() {
  const [state, action, pending] = useActionState(bookVisit, initialState)

  return (
    <form action={action} className="flex flex-col gap-6">
      <Card elevation="e1">
        <div className="flex flex-col gap-4">
          <Text size="label" tone="muted">
            Le client
          </Text>

          <Field label="Nom" required>
            {(p) => <Input {...p} name="client" data-testid="client-visite" />}
          </Field>
          <Field label="E-mail" required>
            {(p) => <Input {...p} name="email" type="email" />}
          </Field>
          <Field label="Téléphone" required help="Il portera la signature du devis par SMS.">
            {(p) => <Input {...p} name="telephone" type="tel" />}
          </Field>
        </div>
      </Card>

      <Card elevation="e1">
        <div className="flex flex-col gap-4">
          <Text size="label" tone="muted">
            Le logement
          </Text>

          <Field label="Adresse" required>
            {(p) => <Input {...p} name="adresse" />}
          </Field>
          <div className="flex flex-wrap gap-4">
            <div className="w-32">
              <Field label="Code postal" required>
                {(p) => <Input {...p} name="code_postal" inputMode="numeric" />}
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Ville" required>
                {(p) => <Input {...p} name="ville" />}
              </Field>
            </div>
          </div>
          <Field label="Objet" required help="Ce que vous allez voir : « remplacement chaudière ».">
            {(p) => <Input {...p} name="objet" />}
          </Field>
        </div>
      </Card>

      <Card elevation="e1">
        <div className="flex flex-col gap-4">
          <Text size="label" tone="muted">
            Le créneau
          </Text>

          <div className="flex flex-wrap gap-4">
            <Field label="Début" required>
              {(p) => (
                <Input {...p} name="debut" type="datetime-local" data-testid="debut-visite" />
              )}
            </Field>
            <Field label="Fin" required>
              {(p) => <Input {...p} name="fin" type="datetime-local" />}
            </Field>
          </div>

          <Field label="Note">{(p) => <Textarea {...p} name="note" rows={2} />}</Field>
        </div>
      </Card>

      <Text size="sm" tone="soft">
        Prendre ce rendez-vous <strong>crée aussi le chantier</strong>. Vous y établirez votre
        devis ensuite.
      </Text>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}

      <div className="self-start">
        <Button type="submit" size="lg" pending={pending}>
          {pending ? 'Enregistrement…' : 'Prendre le rendez-vous'}
        </Button>
      </div>
    </form>
  )
}
