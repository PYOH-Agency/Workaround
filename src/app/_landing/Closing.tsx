import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import styles from './motion.module.css'

/**
 * La derniere demande, et le pied de page.
 *
 * Une seule action mise en avant. Le lien vers l'annuaire est en dessous et
 * sans emphase : il s'adresse au particulier qui a atterri ici par erreur, et
 * lui donner un bouton de meme poids ferait hesiter l'artisan une seconde de
 * plus devant deux portes identiques.
 */
export function Closing() {
  return (
    <>
      <section className="border-t border-rule bg-card">
        <div
          className={`${styles.reveal} mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-16 md:items-center md:py-24 md:text-center`}
        >
          {/* L'apparence d'un h1, la place d'un h2 : l'accroche a deja pris le titre. */}
          <Heading level={1} as="h2">
            Mettez vos papiers d’équerre.
          </Heading>
          <Text tone="soft">
            La création du compte prend le temps de saisir un SIRET. Le reste se remplit tout seul.
          </Text>
          <ButtonLink href="/inscription" tone="conversion" size="lg">
            Créer mon compte
          </ButtonLink>
          <Text size="sm" tone="muted">
            Vous cherchez un artisan ? <Link href="/annuaire">Passez par l’annuaire.</Link>
          </Text>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Lockup size="sm" />
          <nav aria-label="Pied de page" className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/annuaire" tone="bare">
              Annuaire
            </Link>
            <Link href="/passeport/definitions" tone="bare">
              Ce que nous vérifions
            </Link>
            <Link href="/confidentialite" tone="bare">
              Confidentialité
            </Link>
            <Link href="/connexion" tone="bare">
              Se connecter
            </Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
