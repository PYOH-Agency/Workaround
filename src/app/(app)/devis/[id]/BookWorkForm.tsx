'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { bookWork, type BookWorkState } from './actions'

const initialState: BookWorkState = {}

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Le rendez-vous d'intervention.
 *
 * Le chevauchement est dit APRES coup, et sans reproche : le rendez-vous est
 * pris. C'est la decision du jalon rendue visible — on avertit, on n'interdit
 * pas.
 */
export function BookWorkForm({ quoteId }: { quoteId: string }) {
  const [state, action, pending] = useActionState(bookWork.bind(null, quoteId), initialState)

  return (
    <Card elevation="e1">
      <form action={action} className="flex flex-col gap-4">
        <Text size="label" tone="muted">
          Rendez-vous d’intervention
        </Text>

        <div className="flex flex-wrap gap-4">
          <Field label="Début" required error={state.error}>
            {(p) => <Input {...p} name="debut" type="datetime-local" data-testid="debut-intervention" />}
          </Field>
          <Field label="Fin" required>
            {(p) => <Input {...p} name="fin" type="datetime-local" />}
          </Field>
        </div>

        <Field label="Note">{(p) => <Textarea {...p} name="note" rows={2} />}</Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" tone="secondary" pending={pending}>
            {pending ? 'Enregistrement…' : 'Prendre le rendez-vous'}
          </Button>
          {state.booked && (
            <Text size="sm" tone="soft" as="span">
              Enregistré · <Link href="/agenda">voir l’agenda</Link>
            </Text>
          )}
        </div>

        {state.conflicts && state.conflicts.length > 0 && (
          <div
            role="status"
            className="rounded-card border border-warning bg-warning-bg px-4 py-3"
            data-testid="chevauchement"
          >
            <Text size="sm" as="span">
              <strong>Ce rendez-vous en croise un autre.</strong>{' '}
              {state.conflicts
                .map((item) => `${item.customerName}, ${MOMENT.format(new Date(item.startsAt))}`)
                .join(' · ')}
              . Il est tout de même pris.
            </Text>
          </div>
        )}
      </form>
    </Card>
  )
}
