import { redirect } from 'next/navigation'
import { weekOf } from '@/domain/agenda-week'
import { currentCompany, SessionError } from '@/lib/session'
import { weekAgenda, type BookedAppointment } from '@/services/appointments'
import { busyFor } from '@/services/calendar-links'
import { Badge } from '@/ui/atoms/badge'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { PageHeader } from '@/ui/molecules/page-header'
import { Rail, RailItem } from '@/ui/molecules/rail'
import { AppShell } from '@/ui/shells/app-shell'
import { CancelButton } from './CancelButton'
import { BusyNotice, SyncHint } from './BusyNotice'
import { dayAnchor, WeekGrid } from './WeekGrid'

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

/**
 * Le jour courant a Paris, sous la forme `AAAA-MM-JJ`.
 *
 * `toISOString()` aurait rendu la veille pour tout rendez-vous consulte avant
 * 2 h du matin en heure d'ete : le serveur tourne en UTC, et « aujourd'hui »
 * est une question d'heure locale.
 */
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })

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

  const total = days.reduce((sum, day) => sum + day.items.length, 0)
  const today = PARIS_DAY.format(new Date())

  return (
    <AppShell access={session}>
      <PageHeader
        title="Agenda"
        subtitle={
          <span data-testid="semaine">
            Semaine du {DAY_LABEL.format(new Date(`${week[0]}T12:00:00Z`))} ·{' '}
            {total === 0 ? 'rien de prévu' : total === 1 ? '1 rendez-vous' : `${total} rendez-vous`}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/agenda?semaine=${shifted(week, -1)}`} tone="secondary">
              Semaine précédente
            </ButtonLink>
            <ButtonLink href={`/agenda?semaine=${shifted(week, 1)}`} tone="secondary">
              Semaine suivante
            </ButtonLink>
            <ButtonLink href="/agenda/nouveau">Prendre un rendez-vous</ButtonLink>
          </>
        }
      />

      {busy.kind === 'unlinked' && <SyncHint />}

      <WeekGrid days={days.map((day) => ({ day: day.day, count: day.items.length }))} today={today} />

      {/*
        Les sept jours sont rendus, meme vides : sauter les jours creux ferait
        sauter le lecteur d'une date a l'autre, et une semaine sans rendez-vous
        ne se lirait plus comme une semaine.

        Sur la regle et non en cartes : une journee est une suite d'heures, et
        sept titres separes par des boites empechaient de la lire d'un trait.
      */}
      <ul className="flex flex-col gap-8" data-testid="agenda">
        {days.map((day) => (
          <li
            key={day.day}
            id={dayAnchor(day.day)}
            className="flex scroll-mt-6 flex-col gap-2"
            aria-current={day.day === today ? 'date' : undefined}
          >
            <Heading level={3} as="h2">
              {DAY_LABEL.format(new Date(`${day.day}T12:00:00Z`))}
              {day.day === today && (
                <Text size="label" tone="muted" as="span">
                  {' '}
                  · aujourd’hui
                </Text>
              )}
            </Heading>

            <BusyNotice state={busy} day={day.day} />

            {day.items.length === 0 ? (
              <Text size="sm" tone="muted">
                Rien de prévu.
              </Text>
            ) : (
              <Rail as="ul">
                {day.items.map((item) => (
                  <RailItem key={item.id} current={day.day === today}>
                    <Appointment item={item} />
                  </RailItem>
                ))}
              </Rail>
            )}
          </li>
        ))}
      </ul>
    </AppShell>
  )
}

function Appointment({ item }: { item: BookedAppointment }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Text as="span">
          {HOUR.format(item.startsAt)} – {HOUR.format(item.endsAt)}
        </Text>
        <Badge
          tone={item.kind === 'visit' ? 'neutral' : 'verified'}
          icon={<Icon name={item.kind === 'visit' ? 'clock' : 'check'} size="sm" />}
        >
          {item.kind === 'visit' ? 'Visite' : 'Intervention'}
        </Badge>
      </div>

      <Text size="sm">
        <strong>{item.customerName}</strong>
      </Text>

      <Text size="sm" tone="soft">
        {item.address}
      </Text>

      <Text size="sm" tone="muted">
        {item.projectLabel}
        {item.note && ` — ${item.note}`}
      </Text>

      <div className="flex flex-wrap items-center gap-3">
        {/* Il appelle depuis la route : le numero doit se composer d'un doigt,
            donc porter les 44 px de cible tactile plutot que d'etre un lien
            noye au milieu d'un paragraphe. */}
        {item.customerPhone && (
          <ButtonLink href={`tel:${item.customerPhone}`} tone="secondary">
            <Icon name="phone" size="sm" />
            {item.customerPhone}
          </ButtonLink>
        )}
        <CancelButton appointmentId={item.id} />
      </div>
    </div>
  )
}
