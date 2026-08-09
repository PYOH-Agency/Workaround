import type { BusyState } from '@/domain/busy'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'

const HOUR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Ce que dit l'agenda externe pour un jour donne.
 *
 * **Les trois etats sont distincts, et le troisieme est celui qui compte.**
 * Afficher « libre » faute de reponse ferait poser un rendez-vous par-dessus un
 * autre — et l'artisan cesserait de faire confiance a l'ecran, ce qui est pire
 * que l'oubli lui-meme.
 */
export function BusyNotice({ state, day }: { state: BusyState; day: string }) {
  if (state.kind === 'unlinked') {
    return null
  }

  if (state.kind === 'unreadable') {
    return (
      <Text size="sm" tone="soft">
        <span data-testid="occupation">Vos disponibilités n’ont pas pu être lues.</span>
      </Text>
    )
  }

  const sameDay = state.intervals.filter(
    (interval) => interval.from.toISOString().slice(0, 10) === day,
  )

  // Aucun creneau occupe, et nous le SAVONS : rien a dire.
  if (sameDay.length === 0) return null

  return (
    <Text size="sm" tone="muted">
      <span data-testid="occupation">
        Occupé ailleurs :{' '}
        {sameDay
          .map((interval) => `${HOUR.format(interval.from)} – ${HOUR.format(interval.to)}`)
          .join(', ')}
      </span>
    </Text>
  )
}

/** Le renvoi discret vers la synchronisation, quand rien n'est raccordé. */
export function SyncHint() {
  return (
    <Text size="sm" tone="muted">
      <Link href="/agenda/synchronisation">Synchroniser votre agenda</Link> — vos rendez-vous dans
      votre téléphone, et vos disponibilités ici.
    </Text>
  )
}
