import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { InkBand } from '../ink-band'

/**
 * Ce que ça vous evite.
 *
 * Le fait le plus dur de la page — une amende de 15 000 € — ne se dit pas en
 * texte courant : il se MONTRE, un chiffre qui pese, adosse a un filet terre
 * cuite. C'est le pendant sombre du « 0 € » de la section prix : deux chiffres
 * encadrent la promesse — ce qu'un devis non conforme coute, ce que l'outil
 * coute.
 *
 * **Il est passe sur l'encre.** Le meme bloc, sur la craie, se lisait comme une
 * note de bas de page : un chiffre de 112 px pose sur le meme fond que les
 * sept autres sections n'a aucune raison d'etre lu avant elles. La bande
 * d'encre lui donne son poids, et donne son rythme a la page entiere — voir
 * `InkBand` pour la raison complete, et pour la regle des deux bandes.
 */
export function Mentions() {
  return (
    <InkBand
      figure="15 000 €"
      figureLabel="Ce que ça vous évite"
      figureNote="d’amende, par infraction constatée"
    >
      <Heading level={2} tone="inverse">
        Un devis sans mention d’assurance, et l’amende tombe.
      </Heading>
      <Text tone="inverse-soft">
        L’article L243-2 impose sur chaque devis le nom de l’assureur, la référence du contrat, les
        activités garanties et la zone couverte. On les écrit pour vous, une fois, et elles
        apparaissent partout.
      </Text>
    </InkBand>
  )
}
