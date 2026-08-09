import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import styles from './motion.module.css'
import { Squaring } from './Squaring'

/**
 * L'accroche.
 *
 * Elle entre dans la meme foulee que la scene : quatre paliers de 80 ms, et le
 * devis se met d'equerre pendant qu'on finit de lire. Un seul moment orchestre
 * plutot que des effets disperses — le reste de la page bouge a peine.
 *
 * Terre cuite en bouton : c'est une page publique, il n'y a qu'une action et
 * aucune action destructive alentour (spec §5.4).
 */
export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.05fr_1fr] md:gap-16 md:py-24">
      <div className="flex flex-col gap-7">
        {/* Les quatre paliers sont des freres directs : le retard vient du rang. */}
        <div className={styles.step}>
          <Text size="label" tone="muted" as="div">
            Pour les entreprises du bâtiment
          </Text>
        </div>

        <div className={styles.step}>
          <Heading level="hero">Tout est d’équerre.</Heading>
        </div>

        <div className={`${styles.step} max-w-lg`}>
          <Text tone="soft">
            Vos devis et vos factures portent les mentions obligatoires. Votre client signe en
            ligne, par SMS. Votre attestation d’assurance est relevée et rattachée aux activités
            qu’elle couvre — et il peut le vérifier lui-même.
          </Text>
        </div>

        <div className={`${styles.step} flex flex-col gap-4`}>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/inscription" tone="conversion" size="lg">
              Créer mon compte
            </ButtonLink>
            <ButtonLink href="/connexion" tone="secondary" size="lg">
              Se connecter
            </ButtonLink>
          </div>
          <Text size="sm" tone="muted">
            Gratuit, sans carte bancaire.
          </Text>
        </div>
      </div>

      <div className="flex justify-center md:justify-end">
        <Squaring />
      </div>
    </section>
  )
}
