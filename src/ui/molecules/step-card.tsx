import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Une etape numerotee.
 *
 * Le numero est en `aria-hidden` : il ordonne visuellement, mais la liste qui
 * l'entoure porte deja l'ordre pour un lecteur d'ecran. L'annoncer deux fois
 * ne renseigne personne.
 */
export function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-2">
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-badge bg-primary font-display text-xs font-bold text-on-primary"
        >
          {step}
        </span>
        <Heading level={3} as="h3">
          {title}
        </Heading>
        <Text size="sm" tone="soft">
          {children}
        </Text>
      </div>
    </Card>
  )
}
