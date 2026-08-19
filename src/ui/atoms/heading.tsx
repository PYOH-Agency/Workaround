import { cn } from '@/ui/cn'

/**
 * La chasse resserree des tres grands corps.
 *
 * Bricolage porte un axe `wdth` : a 100 il reste ouvert, ce qui convient a un
 * titre de section ; a 92 il se resserre juste assez pour qu'une accroche de
 * six mots tienne sur trois lignes pleines au lieu de quatre lignes trouees.
 * On ne descend pas plus bas — au-dela, la famille perd la rondeur qui la
 * distingue d'une condensee de chantier.
 */
const NARROW = "[font-variation-settings:'wdth'_92]"

const LEVELS = {
  /**
   * Reserve a l'accroche d'une page d'acquisition, jamais a un ecran de travail.
   *
   * Le palier haut reste a 4,5 rem, mais la famille a change : Bricolage a la
   * chasse resserree pese, a corps egal, bien plus qu'Archivo. Un premier
   * essai a 6,5 rem faisait tenir l'accroche sur cinq lignes et poussait
   * l'appel a l'action sous la ligne de flottaison — plus gros n'est pas plus
   * fort quand le titre ne tient plus dans sa colonne.
   */
  hero: `font-display font-extrabold ${NARROW} text-[clamp(2.5rem,4.6vw,4rem)] leading-[0.94] tracking-[-0.04em]`,
  /**
   * Le chiffre-argument d'une bande d'encre : « 15 000 € », « 0 € », « 10 ans ».
   * Ce n'est plus un titre agrandi, c'est un fait qu'on lit d'un bout a l'autre
   * de la piece. A reserver a un nombre court, et pose en `as="p"` : il PARAIT
   * un titre sans en etre un.
   */
  figure: `font-display font-extrabold ${NARROW} text-[clamp(3.25rem,9vw,7.5rem)] leading-[0.85] tracking-[-0.05em]`,
  display: `font-display font-extrabold ${NARROW} text-[clamp(2.25rem,5vw,3.5rem)] leading-[1] tracking-[-0.035em]`,
  1: 'font-display font-extrabold text-[2.25rem] leading-[2.5rem] tracking-[-0.03em]',
  /**
   * Releve de 24 a 30 px au palier haut. Un titre de section a cote d'un
   * chiffre de 160 px doit encore se tenir ; a 24 il se lisait comme une
   * legende.
   */
  2: 'font-display font-bold text-[clamp(1.5rem,2.6vw,1.875rem)] leading-[1.15] tracking-[-0.025em]',
  3: 'font-display font-bold text-[1.1875rem] leading-[1.625rem] tracking-[-0.015em]',
} as const

/**
 * Sur quel fond le titre est pose.
 *
 * `inverse` sert les bandes d'encre de la vitrine — `bg-primary` pleine
 * largeur. Un `tone` plutot qu'une classe passee de l'exterieur : la couleur
 * du texte reste une decision du design system, et `on-primary` est le seul
 * jeton dont le contraste sur `primary` est verifie (`contrast.test.ts`).
 */
const TONES = {
  default: 'text-ink',
  inverse: 'text-on-primary',
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
  tone = 'default',
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
  tone?: keyof typeof TONES
  children: React.ReactNode
}) {
  const Tag =
    as ??
    (level === 'hero' || level === 'display' || level === 'figure'
      ? 'h1'
      : (`h${level}` as 'h1' | 'h2' | 'h3'))
  return <Tag className={cn(TONES[tone], LEVELS[level])}>{children}</Tag>
}
