'use client'

import { useActionState } from 'react'
import { Badge } from '@/ui/atoms/badge'
import { Button } from '@/ui/atoms/button'
import { DateText } from '@/ui/atoms/date-text'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import type { Team } from '@/services/team'
import { invite, remove, revoke, type TeamState } from './actions'

const initialState: TeamState = {}

function Alert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
    >
      {message}
    </div>
  )
}

/**
 * Retirer un membre, annuler une invitation.
 *
 * Chaque ligne porte sa propre action liee a son identifiant : un formulaire
 * unique avec un champ cache aurait suffi, mais le lien explicite rend le
 * bouton inoffensif si la liste se reordonne entre le rendu et le clic.
 */
function RowAction({
  action,
  label,
  pendingLabel,
}: {
  action: (state: TeamState) => Promise<TeamState>
  label: string
  pendingLabel: string
}) {
  const [state, submit, pending] = useActionState(action, initialState)

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={submit}>
        <Button type="submit" tone="secondary" pending={pending}>
          {pending ? pendingLabel : label}
        </Button>
      </form>
      {state.error && <Alert message={state.error} />}
    </div>
  )
}

function InviteForm() {
  const [state, action, pending] = useActionState(invite, initialState)

  return (
    <form key={state.saved ?? 0} action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="E-mail" help="Il recevra un lien de connexion à cette adresse." required>
          {(p) => <Input {...p} type="email" name="email" autoComplete="off" />}
        </Field>

        <Field label="Rôle">
          {(p) => (
            <Select {...p} name="role" defaultValue="member">
              <option value="member">Compagnon</option>
              <option value="owner">Responsable</option>
            </Select>
          )}
        </Field>
      </div>

      {state.error && <Alert message={state.error} />}

      <div className="self-start">
        <Button type="submit" pending={pending}>
          {pending ? 'Envoi…' : 'Inviter'}
        </Button>
      </div>
    </form>
  )
}

export function TeamPanel({ team, meMemberId }: { team: Team; meMemberId: string }) {
  return (
    <div className="flex flex-col gap-8">
      <InviteForm />

      <div className="flex flex-col gap-3" data-testid="equipe">
        {team.members.map((row) => (
          <Card key={row.id} elevation="e1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Text as="span">{row.name ?? row.email}</Text>
                {row.name && (
                  <Text size="sm" tone="muted" as="span">
                    {row.email}
                  </Text>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Badge tone="neutral" icon={<Icon name="check" size="sm" />}>
                  {row.role === 'owner' ? 'Responsable' : 'Compagnon'}
                </Badge>

                {/* On ne se retire pas soi-meme : le geste existe, mais il se
                    fait retirer par quelqu'un d'autre. */}
                {row.id !== meMemberId && (
                  <RowAction
                    action={remove.bind(null, row.id)}
                    label="Retirer"
                    pendingLabel="Retrait…"
                  />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {team.invitations.length > 0 && (
        <div className="flex flex-col gap-3" data-testid="invitations">
          <Text size="label" tone="muted" as="h2">
            Invitations en attente
          </Text>

          {team.invitations.map((row) => (
            <Card key={row.id} elevation="e1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Text as="span">{row.email}</Text>
                  <Text size="sm" tone="muted" as="span">
                    Invité le <DateText value={row.invitedAt} /> comme{' '}
                    {row.role === 'owner' ? 'responsable' : 'compagnon'}
                  </Text>
                </div>

                <RowAction
                  action={revoke.bind(null, row.id)}
                  label="Annuler l’invitation"
                  pendingLabel="Annulation…"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
