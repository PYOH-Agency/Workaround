import { redirect } from 'next/navigation'
import { weekOf } from '@/domain/agenda-week'
import { currentCompany, SessionError } from '@/lib/session'
import { weekAgenda, type BookedAppointment } from '@/services/appointments'
import { busyFor } from '@/services/calendar-links'
import { Badge } from '@/ui/atoms/badge'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { AppShell } from '@/ui/shells/app-shell'
import { CancelButton } from './CancelButton'
import { BusyNotice, SyncHint } from './BusyNotice'

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const HOUR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
})

/** Le lundi d'une semaine décalée de `weeks`, sous la forme `AAAA-MM-JJ`. */
function shifted(week: string[], weeks: number): string {
  return new Date(new Date(`${week[0]}T00:00:00Z`).getTime() + weeks * 7 * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

/**
 * La semaine de l'artisan.
 *
 * **Une liste groupee par jour, pas une grille.** Sept colonnes horaires sur un
 * telephone tenu d'une main sur un chantier ne se lisent pas — et inventer une
 * primitive de grille pour cet ecran serait le pire moment.
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>
}) {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/creer-mon-entreprise' : '/connexion')
    }
    throw e
  }

  const { semaine } = await searchParams
  const asked = semaine ? new Date(`${semaine}T12:00:00Z`) : new Date()
  const around = Number.isNaN(asked.getTime()) ? new Date() : asked

  const week = weekOf(around)
  const [days, busy] = await Promise.all([
    weekAgenda(session.companyId, around),
    // Lus a l'affichage, jamais stockes. Une panne rend `unreadable`, et
    // l'ecran le dit plutot que d'afficher « libre ».
    busyFor(session.companyId, new Date(`${week[0]}T00:00:00Z`), new Date(`${week[6]}T23:59:59Z`)),
  ])

  return (
    <AppShell access={session}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>Agenda</Heading>
          <Text size="sm" tone="soft" as="span">
            <span data-testid="semaine">
              Semaine du {DAY_LABEL.format(new Date(`${week[0]}T12:00:00Z`))}
            </span>
          </Text>
        </div>
        <ButtonLink href="/agenda/nouveau">Prendre un rendez-vous</ButtonLink>
      </div>

      {busy.kind === 'unlinked' && <SyncHint />}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/agenda?semaine=${shifted(week, -1)}`} tone="secondary">
          Semaine précédente
        </ButtonLink>
        <ButtonLink href={`/agenda?semaine=${shifted(week, 1)}`} tone="secondary">
          Semaine suivante
        </ButtonLink>
      </div>

      {/*
        Les sept jours sont rendus, meme vides : sauter les jours creux ferait
        sauter le lecteur d'une date a l'autre, et une semaine sans rendez-vous
        ne se lirait plus comme une semaine.
      */}
      <ul className="flex flex-col gap-6" data-testid="agenda">
        {days.map((day) => (
          <li key={day.day} className="flex flex-col gap-3">
            <Heading level={3} as="h2">
              {DAY_LABEL.format(new Date(`${day.day}T12:00:00Z`))}
            </Heading>

            <BusyNotice state={busy} day={day.day} />

            {day.items.length === 0 ? (
              <Text size="sm" tone="muted">
                Rien de prévu.
              </Text>
            ) : (
              day.items.map((item) => <Appointment key={item.id} item={item} />)
            )}
          </li>
        ))}
      </ul>
    </AppShell>
  )
}

function Appointment({ item }: { item: BookedAppointment }) {
  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Text as="span">
            {HOUR.format(item.startsAt)} – {HOUR.format(item.endsAt)}
          </Text>
          <Badge
            tone={item.kind === 'visit' ? 'neutral' : 'verified'}
            icon={<Icon name={item.kind === 'visit' ? 'clock' : 'check'} />}
          >
            {item.kind === 'visit' ? 'Visite' : 'Intervention'}
          </Badge>
        </div>

        <Text size="sm">
          <strong>{item.customerName}</strong>
          {item.customerPhone && (
            <>
              {' · '}
              {/* Il appelle depuis la route : le numero doit se composer d'un doigt. */}
              <Link href={`tel:${item.customerPhone}`}>{item.customerPhone}</Link>
            </>
          )}
        </Text>

        <Text size="sm" tone="soft">
          {item.address}
        </Text>

        <Text size="sm" tone="muted">
          {item.projectLabel}
          {item.note && ` — ${item.note}`}
        </Text>

        <CancelButton appointmentId={item.id} />
      </div>
    </Card>
  )
}
