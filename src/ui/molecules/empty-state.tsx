import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Un ecran vide dit toujours quoi faire ensuite.
 *
 * `action` est requis, ce n'est pas un oubli d'`?` : un vide sans porte de
 * sortie est un cul-de-sac, et c'est precisement l'ecran que voit un artisan a
 * sa premiere connexion.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <Card elevation="flat">
      <div className="flex flex-col items-start gap-3 py-6">
        <Heading level={3} as="p">
          {title}
        </Heading>
        <Text tone="soft">{description}</Text>
        <div className="mt-2">{action}</div>
      </div>
    </Card>
  )
}
