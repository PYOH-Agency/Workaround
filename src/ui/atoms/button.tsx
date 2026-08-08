import { cn } from '@/ui/cn'
import { Spinner } from './spinner'

/**
 * Composant serveur, volontairement.
 *
 * Un bouton qui soumet un formulaire ou declenche une server action n'a besoin
 * d'aucun JavaScript client. Ajouter 'use client' ici ferait basculer cote
 * client toutes les pages qui l'utilisent — c'est-a-dire toutes.
 */

export const TONES = {
  /**
   * L'encre, pas la terre cuite.
   *
   * Sur un ecran de facturation une action destructive est toujours a portee :
   * un primaire orange et un danger rouge cote a cote, c'est une erreur de clic
   * qui coute une facture.
   */
  primary: 'bg-primary text-on-primary hover:opacity-90',
  /**
   * La seule place de la terre cuite en fond : une page publique, une seule
   * action, aucune action destructive alentour.
   */
  conversion: 'bg-conversion text-on-conversion font-semibold hover:opacity-90',
  secondary: 'border border-field text-ink hover:bg-rule/40',
  ghost: 'text-ink hover:bg-rule/40',
  danger: 'text-danger hover:bg-danger-bg',
  'danger-solid': 'bg-danger-solid text-on-danger hover:opacity-90',
} as const

export const SIZES = {
  /** min-h-11 = 44 px : la cible tactile minimale, quelle que soit la taille du texte. */
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
} as const

/**
 * L'ossature partagee par `Button` et `ButtonLink`.
 *
 * Les deux existent parce que le HTML distingue agir et naviguer : imbriquer un
 * `<button>` dans un `<a>` est invalide et brouille le role annonce.
 */
export function buttonStyle(tone: keyof typeof TONES, size: keyof typeof SIZES): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-control',
    'font-medium transition-opacity',
    'disabled:opacity-45 disabled:pointer-events-none',
    TONES[tone],
    SIZES[size],
  )
}

export function Button({
  tone = 'primary',
  size = 'md',
  type = 'button',
  pending = false,
  disabled = false,
  name,
  value,
  onClick,
  children,
}: {
  tone?: keyof typeof TONES
  size?: keyof typeof SIZES
  type?: 'button' | 'submit' | 'reset'
  pending?: boolean
  disabled?: boolean
  name?: string
  value?: string
  /**
   * N'oblige pas ce fichier a passer client.
   *
   * Un composant sans directive rendu depuis un composant client fait partie du
   * paquet client : `onClick` y fonctionne. Rendu depuis un composant serveur,
   * il reste serveur — a condition de ne pas lui passer `onClick`, ce que
   * TypeScript ne peut pas verifier mais que le build signalera.
   */
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type={type}
      name={name}
      value={value}
      onClick={onClick}
      // Desactiver pendant l'attente empeche la double soumission — le defaut le
      // plus couteux sur une emission de facture. `aria-busy` l'annonce.
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonStyle(tone, size)}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  )
}
