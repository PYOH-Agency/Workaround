import { Badge } from '@/ui/atoms/badge'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { SectionHeader } from '@/ui/molecules/section-header'

export function Passport() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-6">
        <SectionHeader
          label="Ce que personne d’autre ne fait"
          title="Votre assurance, vérifiée activité par activité."
          lead="Un artisan assuré en plomberie qui refait un tableau électrique n’est pas couvert — et son client n’a aucun recours. Nous croisons votre attestation avec vos activités déclarées, et nous affichons le résultat en clair."
        />
        <div className="flex flex-wrap gap-2">
          <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
            Plomberie · couverte
          </Badge>
          <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
            Chauffage · couverte
          </Badge>
          <Badge tone="warning" icon={<Icon name="alert" size="sm" />}>
            Électricité · attestation manquante
          </Badge>
        </div>
        <Text size="sm" tone="muted">
          Chaque activité couverte apparaît sur votre page publique. Les autres n’y figurent pas —
          c’est ce qui rend la page crédible.
        </Text>
      </div>
    </section>
  )
}
