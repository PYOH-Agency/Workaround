import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Les engagements du §12 du socle.
 *
 * Ce n'est pas une mention de bas de page : pour un artisan demarche dix fois
 * par des vendeurs de leads, c'est le meilleur argument de la page — et aucun
 * concurrent ne peut ecrire ces phrases.
 */
export function PrinciplePanel({ principles }: { principles: string[] }) {
  return (
    <Card elevation="e1">
      <ul className="flex flex-col gap-4">
        {principles.map((principle) => (
          <li key={principle} className="flex items-start gap-3">
            <span className="mt-0.5 text-verified">
              <Icon name="check" size="sm" />
            </span>
            <Text as="span">{principle}</Text>
          </li>
        ))}
      </ul>
    </Card>
  )
}
