import { cn } from '@/ui/cn'

const SIZES = {
  md: 'text-base leading-[1.625]',
  sm: 'text-sm leading-[1.5]',
  label: 'text-[0.6875rem] leading-[0.875rem] font-semibold uppercase tracking-[0.08em]',
} as const

/**
 * `inverse` et `inverse-soft` servent les bandes d'encre de la vitrine —
 * `bg-primary` pleine largeur. Elles ne sont pas la transposition sombre de
 * `default` et `soft` : c'est un fond, pas un theme, et `dark:` n'a aucune
 * prise sur un sous-arbre encre pose dans un sous-arbre clair (tokens.css).
 * D'ou deux tons nommes, dont le contraste est verifie comme les autres.
 */
const TONES = {
  default: 'text-ink',
  soft: 'text-ink-soft',
  muted: 'text-ink-muted',
  inverse: 'text-on-primary',
  'inverse-soft': 'text-on-primary-soft',
} as const

export function Text({
  size = 'md',
  tone = 'default',
  as: Tag = 'p',
  children,
}: {
  size?: keyof typeof SIZES
  tone?: keyof typeof TONES
  /**
   * Les niveaux de titre sont admis pour le cas ou une etiquette **est** le
   * titre de son bloc — une carte de metrique, dont le chiffre est la valeur et
   * non l'intitule. `Heading` refuserait : son apparence est celle d'un titre,
   * et c'est justement l'apparence d'etiquette qu'on veut garder ici.
   */
  as?: 'p' | 'span' | 'div' | 'dt' | 'dd' | 'h2' | 'h3' | 'h4'
  children: React.ReactNode
}) {
  return <Tag className={cn(SIZES[size], TONES[tone])}>{children}</Tag>
}
