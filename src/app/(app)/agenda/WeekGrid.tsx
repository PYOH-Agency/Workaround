import Link from 'next/link'
import { cn } from '@/ui/cn'

const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' })
const DAY_NUMBER = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric' })
const FULL = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** L'ancre d'un jour, partagee avec la liste. */
export function dayAnchor(day: string): string {
  return `jour-${day}`
}

/**
 * La semaine d'un coup d'œil.
 *
 * L'ecran ne repondait pas a la seule question que pose un agenda — OU EST LE
 * TROU. Sept titres de jour et cinq « Rien de prevu » separes par des cartes
 * obligeaient a defiler trois fois pour compter cinq rendez-vous, et deux
 * boutons identiques — « Semaine precedente », « Semaine suivante » — tenaient
 * lieu de reperage.
 *
 * **Une bande de sept, et non une grille horaire.** La grille etait le geste
 * evident, et elle a ete ecartee : un rendez-vous y devient un bloc de la
 * hauteur de sa duree, trop court pour porter le bouton d'annulation et
 * l'adresse. Il aurait fallu inventer un ecran de detail — une decision de
 * produit, pas de dessin. La bande donne la lecture d'ensemble sans rien
 * retirer a la liste, qui garde tous ses gestes.
 *
 * Le jour courant se marque **trois fois** : le filet, la couleur de
 * l'etiquette et `aria-current`. Meme discipline qu'`AppNav` — la couleur ne
 * porte jamais seule.
 */
export function WeekGrid({
  days,
  today,
}: {
  days: { day: string; count: number }[]
  /** `AAAA-MM-JJ` a Paris, calcule par la page : le rendu ne lit pas l'horloge. */
  today: string
}) {
  return (
    <nav aria-label="Les jours de la semaine">
      <ul className="grid grid-cols-7 overflow-hidden rounded-card border border-rule bg-card">
        {days.map(({ day, count }) => {
          const current = day === today
          const date = new Date(`${day}T12:00:00Z`)

          return (
            <li key={day} className="border-l border-rule first:border-l-0">
              <Link
                href={`#${dayAnchor(day)}`}
                aria-current={current ? 'date' : undefined}
                aria-label={`${FULL.format(date)} — ${label(count)}`}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2',
                  'border-b-2 hover:bg-rule/30',
                  current ? 'border-brand' : 'border-transparent',
                )}
              >
                <span
                  className={cn(
                    'text-[0.6875rem] font-semibold tracking-[0.08em] uppercase',
                    current ? 'text-brand' : 'text-ink-muted',
                  )}
                >
                  {WEEKDAY.format(date)}
                </span>
                <span className="text-base tabular-nums text-ink">{DAY_NUMBER.format(date)}</span>

                {/*
                  Un carre par rendez-vous, jusqu'a quatre. Au-dela, le compte
                  s'ecrit : cinq carres alignes ne se comptent plus d'un coup
                  d'œil, et c'est tout ce qu'on leur demande.
                */}
                <span aria-hidden="true" className="flex h-1.5 items-center gap-1">
                  {count > 4 ? (
                    <span className="text-[0.625rem] tabular-nums text-ink-muted">{count}</span>
                  ) : (
                    Array.from({ length: count }, (_, index) => (
                      <span
                        key={index}
                        className={cn('block size-1.5', current ? 'bg-brand' : 'bg-ink-muted')}
                      />
                    ))
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function label(count: number): string {
  if (count === 0) return 'rien de prévu'
  return count === 1 ? '1 rendez-vous' : `${count} rendez-vous`
}
