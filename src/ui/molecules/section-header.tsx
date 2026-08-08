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
 */
export function SectionHeader({
  label,
  title,
  lead,
  as = 'h2',
}: {
  label?: string
  title: React.ReactNode
  lead?: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}) {
  return (
    <div className="flex flex-col gap-3">
      {label ? (
        <Text size="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <Heading level={2} as={as}>
        {title}
      </Heading>
      {lead ? (
        <div className={LEAD_MEASURE}>
          <Text as="div" tone="soft">
            {lead}
          </Text>
        </div>
      ) : null}
    </div>
  )
}
