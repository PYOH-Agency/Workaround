/**
 * La marque : une equerre de macon. Le bras vertical en encre, la lame en
 * terre cuite, et le carre de l'angle interieur — signe conventionnel de
 * l'angle droit verifie.
 *
 * Elle s'exprime, elle ne s'appose pas : en-tete, logotype, signature. Jamais
 * dans un cadre — pour ca, c'est `Seal`.
 *
 * Deux tons suffisent. `brand` lit les variables de theme, donc le bras
 * s'inverse tout seul en mode sombre ; `mono` suit `currentColor`, ce qui
 * couvre a la fois l'impression une encre et un fond de couleur.
 */
export function Mark({
  size = 32,
  tone = 'brand',
}: {
  size?: number
  tone?: 'brand' | 'mono'
}) {
  const arm = tone === 'brand' ? 'var(--dq-ink)' : 'currentColor'
  const blade = tone === 'brand' ? 'var(--dq-brand)' : 'currentColor'

  // Sous 24 px le carre de l'angle se refermerait en tache : on le retire.
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
      <path d="M8 4 H19 V29 H8 Z" fill={arm} />
      <path d="M8 29 H44 V40 H8 Z" fill={blade} />
      {showAngle ? <rect x="19" y="22" width="7" height="7" fill={arm} /> : null}
    </svg>
  )
}
