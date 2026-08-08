const LONG = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const SHORT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * Une date.
 *
 * `<time dateTime>` porte la valeur lisible par une machine, le texte porte la
 * version francaise. Le format court est en chiffres tabulaires pour s'aligner
 * en colonne de tableau.
 */
export function DateText({
  value,
  format = 'long',
}: {
  value: Date | string
  format?: 'long' | 'short'
}) {
  const date = typeof value === 'string' ? new Date(value) : value
  const iso = date.toISOString().slice(0, 10)
  return (
    <time dateTime={iso} className={format === 'short' ? 'tabular-nums' : undefined}>
      {format === 'long' ? LONG.format(date) : SHORT.format(date)}
    </time>
  )
}
