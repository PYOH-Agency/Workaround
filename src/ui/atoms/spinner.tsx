/**
 * Indicateur d'attente.
 *
 * `motion-reduce:animate-none` respecte `prefers-reduced-motion` : l'indicateur
 * reste visible, simplement immobile. Le faire disparaitre priverait
 * l'utilisateur de l'information.
 */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
