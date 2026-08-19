import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'

/** Largeur de lecture confortable pour un chapeau : au-dela, l'oeil peine a retrouver la ligne suivante. */
const LEAD_MEASURE = 'max-w-[52ch]'

/**
 * Etiquette, titre, chapeau. Repete onze fois sur les deux pages de la landing.
 *
 * `label` est facultatif : l'accroche d'une page n'en porte pas, une section
 * courante si. `level` porte l'apparence et reste fixe — la charte des
 * sections ne doit pas varier — tandis que `as` porte la semantique et
 * s'ajuste a la structure de la page qui accueille le composant.
 *
 * `layout` :
 * - `stack` (defaut) — etiquette, titre, chapeau empiles. Pour une colonne
 *   etroite, ou une section qui porte deja son propre second bloc a cote.
 * - `split` — sur grand ecran, le titre a gauche, le chapeau a droite. C'est
 *   ce qui empeche une section de tout texte de se lire comme un ruban
 *   vertical colle a la marge gauche : le regard traverse au lieu de tomber.
 */
export function SectionHeader({
  label,
  title,
  lead,
  as = 'h2',
  layout = 'stack',
  tone = 'default',
}: {
  label?: string
  title: React.ReactNode
  lead?: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  layout?: 'stack' | 'split'
  /**
   * `inverse` pour une section posee sur `bg-primary` — les bandes d'encre de
   * la vitrine. Les trois tons descendent ensemble : un titre inverse au-dessus
   * d'un chapeau reste encre serait illisible, et c'est exactement l'oubli
   * qu'un ton porte par le composant empeche.
   */
  tone?: 'default' | 'inverse'
}) {
  const dark = tone === 'inverse'
  const heading = (
    <div className="flex flex-col gap-3">
      {label ? (
        <Text size="label" tone={dark ? 'inverse-soft' : 'muted'}>
          {label}
        </Text>
      ) : null}
      <Heading level={2} as={as} tone={dark ? 'inverse' : 'default'}>
        {title}
      </Heading>
    </div>
  )

  // Sans chapeau, `split` n'aurait qu'une colonne a repartir : il retombe sur la
  // pile, quoi qu'on demande.
  if (layout === 'split' && lead) {
    return (
      <div className="grid gap-x-12 gap-y-5 md:grid-cols-2 md:items-end">
        {heading}
        <div className="md:pb-1">
          <Text as="div" tone={dark ? 'inverse-soft' : 'soft'}>
            {lead}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {heading}
      {lead ? (
        <div className={LEAD_MEASURE}>
          <Text as="div" tone={dark ? 'inverse-soft' : 'soft'}>
            {lead}
          </Text>
        </div>
      ) : null}
    </div>
  )
}
