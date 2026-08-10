'use client'

import { useActionState } from 'react'
import { Badge } from '@/ui/atoms/badge'
import { Button } from '@/ui/atoms/button'
import { DateText } from '@/ui/atoms/date-text'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { Notice } from '@/ui/molecules/notice'
import { DataTable } from '@/ui/organisms/data-table'
import type { Team } from '@/services/team'
import { invite, remove, revoke, type TeamState } from './actions'

const initialState: TeamState = {}

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
      {state.error && (
        <Notice tone="danger" alert>
          {state.error}
        </Notice>
      )}
    </div>
  )
}

/**
 * Deux glyphes, et non deux fois le meme.
 *
 * Le ton reste `neutral` dans les deux cas : un role n'est pas un statut, et
 * lui donner le vert de « verifie » ferait croire que le responsable est valide
 * et le compagnon en attente. C'est le picto qui distingue — la cle ouvre, le
 * marteau travaille.
 */
function RoleBadge({ role }: { role: string }) {
  return (
    <Badge tone="neutral" icon={<Icon name={role === 'owner' ? 'key' : 'hammer'} size="sm" />}>
      {role === 'owner' ? 'Responsable' : 'Compagnon'}
    </Badge>
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

      {state.error && (
        <Notice tone="danger" alert>
          {state.error}
        </Notice>
      )}

      <div className="self-start">
        <Button type="submit" pending={pending}>
          {pending ? 'Envoi…' : 'Inviter'}
        </Button>
      </div>
    </form>
  )
}

/**
 * L'equipe en tableau.
 *
 * On y cherche une ligne parmi d'autres — qui est responsable, qui reste a
 * retirer —, ce qui est une comparaison et non une suite. Quatre cartes
 * empilees obligeaient a relire quatre blocs pour repondre.
 */
export function TeamPanel({ team, meMemberId }: { team: Team; meMemberId: string }) {
  return (
    <div className="flex flex-col gap-8">
      <InviteForm />

      <DataTable
        testId="equipe"
        caption="Les membres de votre équipe et leur rôle"
        columns={[
          { label: 'Membre' },
          { label: 'Rôle' },
          { label: 'Action', hideLabel: true, align: 'right' },
        ]}
        rows={team.members.map((row) => ({
          id: row.id,
          cells: [
            <div key="who" className="flex flex-col gap-0.5">
              <Text as="span">{row.name ?? row.email}</Text>
              {row.name && (
                <Text size="sm" tone="muted" as="span">
                  {row.email}
                </Text>
              )}
            </div>,
            <RoleBadge key="role" role={row.role} />,
            // On ne se retire pas soi-meme : le geste existe, mais il se fait
            // retirer par quelqu'un d'autre.
            row.id === meMemberId ? (
              <Text key="do" size="sm" tone="muted" as="span">
                Vous
              </Text>
            ) : (
              <RowAction
                key="do"
                action={remove.bind(null, row.id)}
                label="Retirer"
                pendingLabel="Retrait…"
              />
            ),
          ],
        }))}
      />

      {team.invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <Text size="label" tone="muted" as="h2">
            Invitations en attente
          </Text>

          <DataTable
            testId="invitations"
            caption="Les invitations envoyées et pas encore acceptées"
            columns={[
              { label: 'Adresse invitée' },
              { label: 'Rôle proposé' },
              { label: 'Action', hideLabel: true, align: 'right' },
            ]}
            rows={team.invitations.map((row) => ({
              id: row.id,
              cells: [
                <div key="who" className="flex flex-col gap-0.5">
                  <Text as="span">{row.email}</Text>
                  <Text size="sm" tone="muted" as="span">
                    Invité le <DateText value={row.invitedAt} />
                  </Text>
                </div>,
                <RoleBadge key="role" role={row.role} />,
                <RowAction
                  key="do"
                  action={revoke.bind(null, row.id)}
                  label="Annuler l’invitation"
                  pendingLabel="Annulation…"
                />,
              ],
            }))}
          />
        </section>
      )}
    </div>
  )
}
