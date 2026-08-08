import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'

/**
 * Etiquette, titre, chapeau. Repete onze fois sur les deux pages de la landing.
 *
 * `label` est facultatif : l'accroche d'une page n'en porte pas, une section
 * courante si.
 */
export function SectionHeader({
  label,
  title,
  lead,
}: {
  label?: string
  title: React.ReactNode
  lead?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      {label ? (
        <Text size="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <Heading level={2} as="h2">
        {title}
      </Heading>
      {lead ? (
        <div className="max-w-[52ch]">
          <Text tone="soft">{lead}</Text>
        </div>
      ) : null}
    </div>
  )
}
