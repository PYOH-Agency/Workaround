import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { PublicShell } from '@/ui/shells/public-shell'

export const metadata = {
  title: 'Page introuvable',
}

/**
 * La page servie pour une adresse qui n'existe pas — et pour tout `notFound()`.
 *
 * Sans elle, Next rend son gabarit par defaut : « This page could not be
 * found », en anglais, sur fond noir, hors de toute marque. Or l'adresse la
 * plus exposee du produit est publique — le lien d'un sceau qu'on partage, une
 * page d'artisan recopiee de travers. Un visiteur venu verifier une assurance
 * qui tombe sur un ecran d'erreur brut n'y lit pas « lien perime », il y lit
 * « site casse », et c'est la confiance meme que vend le produit qui s'effrite.
 *
 * `plain` plutot que `document` : ce n'est pas une piece emise, c'est un cul-de-
 * sac dont on veut sortir vite — un titre, une phrase, une porte.
 */
export default function NotFound() {
  return (
    <PublicShell variant="plain">
      <div className="flex flex-col items-start gap-4">
        <Heading level={1}>Cette page n’existe pas.</Heading>
        <Text tone="soft">
          Le lien est peut-être incomplet, ou la page a changé d’adresse. Rien de grave — repartez de
          l’accueil.
        </Text>
        <ButtonLink href="/">Retour à l’accueil</ButtonLink>
      </div>
    </PublicShell>
  )
}
