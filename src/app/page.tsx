import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { PublicShell } from '@/ui/shells/public-shell'

/**
 * Accueil.
 *
 * Ce n'est pas une page marketing : c'est la suppression du gabarit de
 * demonstration de create-next-app, qui occupait encore cette route. La vraie
 * page d'acquisition viendra avec le passeport public, en M3.
 */
export default function Home() {
  return (
    <PublicShell variant="plain">
      <div className="flex flex-col gap-4">
        <Heading level="display">Tout est d’équerre.</Heading>
        <Text tone="soft">
          Faites vos devis et vos factures, faites-les signer, et montrez que votre assurance est à
          jour. Gratuit, et conforme aux mentions obligatoires du bâtiment.
        </Text>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/connexion" size="lg">
          Se connecter
        </ButtonLink>
        <ButtonLink href="/inscription" tone="secondary" size="lg">
          Créer un compte
        </ButtonLink>
      </div>
    </PublicShell>
  )
}
