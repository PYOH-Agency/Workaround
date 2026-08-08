import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Une etape numerotee.
 *
 * Le numero est decoratif : `Stagger`, seul enrobage prevu pour ces cartes,
 * les place dans de simples `div`, pas dans une `<ol>`. Aucune liste
 * semantique ne porte donc l'ordre pour un lecteur d'ecran — un texte
 * `sr-only` le fait a sa place, juste apres le chiffre.
 */
export function StepCard({
  step,
  title,
  children,
  as = 'h3',
}: {
  step: number
  title: React.ReactNode
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
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
        <span className="sr-only">Étape {step}</span>
        <Heading level={3} as={as}>
          {title}
        </Heading>
        <Text as="div" size="sm" tone="soft">
          {children}
        </Text>
      </div>
    </Card>
  )
}
