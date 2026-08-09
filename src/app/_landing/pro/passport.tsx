import { Badge } from '@/ui/atoms/badge'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { SealBadge } from '@/ui/molecules/seal-badge'
import { SectionHeader } from '@/ui/molecules/section-header'

/**
 * Le sceau montre est le composant reel, pas une image : il ne peut donc pas
 * deriver de ce que le produit appose vraiment. Il porte l'activite et
 * l'adresse comme partout ailleurs (spec image de marque §4.5), avec une
 * adresse tronquee et sans raison sociale — c'est un specimen de format, et
 * l'etiquette au-dessus le dit. Fabriquer une entreprise verifiee pour
 * illustrer la verification serait exactement le mensonge que le produit
 * existe pour supprimer.
 */
export function Passport() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr] md:gap-14">
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
            Chaque activité couverte apparaît sur votre page publique. Les autres n’y figurent pas
            — c’est ce qui rend la page crédible.
          </Text>
        </div>

        <div className="flex flex-col gap-3 md:justify-self-end">
          <Text size="label" tone="muted" as="div">
            Le sceau, tel qu’il s’affiche
          </Text>
          <SealBadge activities="Couverture, zinguerie" passportUrl="dequerre.fr/artisan/…" />
        </div>
      </div>
    </section>
  )
}
