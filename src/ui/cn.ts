/**
 * Concatenation conditionnelle de classes.
 *
 * Volontairement plus pauvre que `clsx` : les composants du design system
 * n'acceptent pas de `className` arbitraire sur leur ossature, donc il n'y a
 * jamais de conflit d'utilitaires a resoudre et `tailwind-merge` est inutile.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
