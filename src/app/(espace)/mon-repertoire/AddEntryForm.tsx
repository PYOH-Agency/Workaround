'use client'

import { useActionState } from 'react'
import { MAX_NOTE_LENGTH } from '@/domain/address-book'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { addEntry, type AddEntryState } from './actions'

const initialState: AddEntryState = {}

/**
 * Ajouter une entreprise absente de la plateforme.
 *
 * Le texte dit ce qui ne se passera pas : **nous ne la prevenons pas**. Sans
 * cette phrase, le demandeur pourrait croire qu'il declenche une mise en
 * relation, et s'etonner du silence.
 */
export function AddEntryForm({ activities }: { activities: { code: string; label: string }[] }) {
  const [state, action, pending] = useActionState(addEntry, initialState)

  return (
    <Card elevation="e1">
      <form action={action} className="flex flex-col gap-4">
        <Text size="label" tone="muted">
          Ajouter une entreprise
        </Text>

        <Text size="sm" tone="soft">
          Le couvreur de 2019, l’électricien du voisin — celles que nous ne connaissons pas.{' '}
          <strong>Nous ne les prévenons pas</strong> : cette fiche est pour vous.
        </Text>

        <Field label="Nom" required error={state.error}>
          {(p) => <Input {...p} name="nom" data-testid="nom-entreprise" />}
        </Field>

        <Field label="Téléphone">{(p) => <Input {...p} name="telephone" type="tel" />}</Field>

        <Field label="Activité" help="Facultative.">
          {(p) => (
            <Select {...p} name="activite" defaultValue="">
              <option value="">— Je ne sais pas</option>
              {activities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Note" help={`${MAX_NOTE_LENGTH} caractères maximum.`}>
          {(p) => <Textarea {...p} name="note" rows={2} maxLength={MAX_NOTE_LENGTH} />}
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" tone="secondary" pending={pending}>
            {pending ? 'Ajout…' : 'Ajouter au répertoire'}
          </Button>
          {state.added && (
            <Text size="sm" tone="soft">
              Ajouté.
            </Text>
          )}
        </div>
      </form>
    </Card>
  )
}
