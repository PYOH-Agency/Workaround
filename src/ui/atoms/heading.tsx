import { cn } from '@/ui/cn'

const LEVELS = {
  display: 'font-display font-extrabold text-[2.5rem] leading-[2.75rem] tracking-[-0.03em]',
  1: 'font-display font-extrabold text-[2rem] leading-[2.375rem] tracking-[-0.025em]',
  2: 'font-display font-bold text-2xl leading-[1.875rem] tracking-[-0.02em]',
  3: 'font-display font-bold text-[1.1875rem] leading-[1.625rem] tracking-[-0.015em]',
} as const

/**
 * Un titre.
 *
 * `level` porte l'apparence, `as` porte la semantique. Les separer permet un
 * `h2` d'apparence `display` sans trouer la hierarchie des titres — le defaut
 * d'accessibilite le plus courant des interfaces soignees.
 */
export function Heading({
  level,
  as,
  children,
}: {
  level: keyof typeof LEVELS
  /**
   * `'p'` rend l'apparence d'un titre sans en etre un.
   *
   * A reserver aux deux seuls cas legitimes : un chapeau introductif, et la
   * planche typographique de la vitrine. Partout ailleurs, un titre visuel qui
   * n'est pas un titre reel prive un lecteur d'ecran de la structure de la page.
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p'
  children: React.ReactNode
}) {
  const Tag = as ?? (level === 'display' ? 'h1' : (`h${level}` as 'h1' | 'h2' | 'h3'))
  return <Tag className={cn('text-ink', LEVELS[level])}>{children}</Tag>
}
