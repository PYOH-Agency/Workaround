import { Text } from '@/ui/atoms/text'
import { Seal } from '@/ui/brand/seal'

/**
 * Le sceau de verification — l'objet que l'artisan diffuse lui-meme.
 *
 * Regle non negociable de la spec (§4.5) : le sceau porte **toujours**
 * l'activite couverte, et l'adresse du passeport des qu'il quitte le passeport.
 * Un sceau qui affiche « verifiee » sans dire de quoi ni ou le verifier est
 * exactement le mensonge que le produit existe pour supprimer.
 *
 * D'ou l'union discriminee plutot qu'une prop optionnelle : sur le passeport
 * lui-meme l'adresse est celle de la page en cours et l'afficher n'apprend
 * rien ; partout ailleurs elle est obligatoire, et c'est le compilateur qui
 * l'exige.
 */
type SealBadgeProps =
  | { format: 'page'; activities: string }
  | { format?: 'block' | 'compact'; activities: string; passportUrl: string }

export function SealBadge(props: SealBadgeProps) {
  const { activities } = props
  const format = props.format ?? 'block'

  if (format === 'compact') {
    return (
      <span className="inline-flex items-center gap-2 rounded-control border border-rule bg-card px-3 py-2">
        <Seal size={24} />
        <Text size="sm" as="span">
          <strong>Entreprise vérifiée</strong>
        </Text>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-4 rounded-card border border-rule bg-card p-4">
      <Seal size={40} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text size="sm" as="span">
          <strong>Entreprise vérifiée</strong>
        </Text>
        {/*
          « Attestations controlees » et non « assurance a jour » : nous avons
          releve un document et sa date, nous ignorons l'etat du contrat qu'il
          atteste. Le sceau ne peut pas affirmer plus que la page vers laquelle
          il mene, sinon c'est lui qu'on opposera le jour d'un sinistre.
        */}
        <Text size="sm" tone="muted" as="span">
          Attestations contrôlées · {activities}
        </Text>
        {format === 'block' && 'passportUrl' in props ? (
          <Text size="sm" tone="muted" as="span">
            {props.passportUrl}
          </Text>
        ) : null}
      </div>
    </div>
  )
}
