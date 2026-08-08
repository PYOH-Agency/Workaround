/**
 * Le sceau : l'equerre en reserve dans un medaillon.
 *
 * Il s'appose, il ne s'exprime pas — favicon, icone d'application, sceau de
 * verification, tampon. Toujours seul, jamais accompagne du logotype.
 *
 * Le choix du medaillon est dicte par l'usage : a 16 px la masse sombre tient
 * l'espace la ou la marque bicolore flotte, et sur un devis photocopie en une
 * seule encre le bicolore perd tout son interet.
 */
export function Seal({
  size = 32,
  tone = 'brand',
}: {
  size?: number
  tone?: 'brand' | 'mono'
}) {
  const medallion = tone === 'brand' ? 'var(--dq-ink)' : 'currentColor'
  const reserve = tone === 'brand' ? 'var(--dq-card)' : 'var(--dq-raised)'
  const showAngle = size >= 24

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="11" fill={medallion} />
      <path d="M13 10 H21 V28 H38 V36 H13 Z" fill={reserve} />
      {showAngle ? (
        <rect x="21" y="21" width="7" height="7" fill="var(--dq-brand)" />
      ) : null}
    </svg>
  )
}
