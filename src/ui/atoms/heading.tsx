import { cn } from '@/ui/cn'

const LEVELS = {
  /**
   * Reserve a l'accroche d'une page d'acquisition, jamais a un ecran de travail.
   *
   * `display` est calibre pour un titre de document a 40 px : sur une page dont
   * le seul travail est de convaincre, il a la taille d'un titre de formulaire.
   * D'ou une variante plutot qu'un `unsafeClassName` — le systeme prevoit qu'on
   * lui ajoute des variantes, pas qu'on le contourne.
   */
  hero: 'font-display font-extrabold text-[clamp(2.75rem,7vw,4.5rem)] leading-[0.95] tracking-[-0.035em]',
  /**
   * Le chiffre-argument d'une section de la vitrine : « 15 000 € », « 0 € ».
   * Plus grand que `display` — c'est un fait qu'on veut voir de loin, pas un
   * titre. A reserver a un nombre court, adosse a un filet d'accent, et pose
   * en `as="p"` : il PARAIT un titre sans en etre un.
   */
  figure: 'font-display font-extrabold text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-[-0.04em]',
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
  const Tag =
    as ??
    (level === 'hero' || level === 'display' || level === 'figure'
      ? 'h1'
      : (`h${level}` as 'h1' | 'h2' | 'h3'))
  return <Tag className={cn('text-ink', LEVELS[level])}>{children}</Tag>
}
