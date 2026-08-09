import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { SealBadge } from '@/ui/molecules/seal-badge'
import styles from './motion.module.css'

/**
 * Le passeport public et son sceau.
 *
 * Le sceau montre est le composant reel, pas une image : il ne peut donc pas
 * deriver de ce que le produit appose vraiment. Il porte l'activite et
 * l'adresse comme partout ailleurs (regle non negociable, spec §4.5), avec une
 * adresse tronquee et sans raison sociale — c'est un specimen de format, et
 * l'etiquette au-dessus le dit. Fabriquer une entreprise verifiee pour
 * illustrer la verification serait exactement le mensonge que le produit
 * existe pour supprimer.
 */
export function Passport() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:gap-16 md:py-24">
      <div className={`${styles.reveal} flex flex-col gap-5`}>
        <Text size="label" tone="muted" as="div">
          Le passeport public
        </Text>
        <Heading level={2}>Votre client n’a pas à vous croire sur parole.</Heading>
        <Text tone="soft">
          Chaque entreprise a une page publique : les activités couvertes, les attestations
          relevées, et la date de chacune. Vous posez le sceau sur vos devis, votre site, votre
          camion — il mène à cette page, et c’est la page qui répond à votre place.
        </Text>
        <Text size="sm" tone="muted">
          L’affirmation y est toujours datée. Nous relevons un document et son échéance ; nous
          n’affirmons pas l’état d’un contrat.
        </Text>
        <div>
          <Link href="/annuaire">Chercher une entreprise dans l’annuaire</Link>
        </div>
      </div>

      <div className={`${styles.reveal} flex flex-col gap-3 md:justify-self-end`}>
        <Text size="label" tone="muted" as="div">
          Le sceau, tel qu’il s’affiche
        </Text>
        <SealBadge activities="Couverture, zinguerie" passportUrl="dequerre.fr/artisan/…" />
      </div>
    </section>
  )
}
