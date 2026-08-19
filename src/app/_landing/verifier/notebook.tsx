import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { InkBand } from '../ink-band'

/**
 * Le carnet du logement, sur l'encre.
 *
 * **Cette section annoncait « Bientot » une chose qui existe.** L'espace du
 * demandeur est livre depuis M6 : `mes-logements`, le dossier de chaque
 * chantier, le repertoire. Annoncer comme a venir ce qui est deja la est le
 * defaut le plus couteux qu'une page de confiance puisse porter.
 *
 * Elle porte desormais la promesse de l'accroche, et elle ferme la page : c'est
 * la seconde bande d'encre, le pendant du piege qui l'ouvrait. Dix ans est le
 * chiffre juste a mettre en regard — c'est la duree de la garantie decennale,
 * donc la duree pendant laquelle ces documents servent encore a quelque chose.
 * C'est aussi le seul argument que personne ne peut opposer a un classeur : un
 * classeur ne sait pas quand une garantie expire.
 *
 * Ce qui reste vrai et qui est dit en toutes lettres : l'espace **s'ouvre a la
 * signature**. Ce n'est pas une file d'attente, c'est une consequence de la
 * decision du §10 du socle — aucun compte a creer, aucune adresse collectee
 * avant qu'un devis ne soit signe.
 */
export function Notebook() {
  return (
    <InkBand
      figure="10 ans"
      figureLabel="Ce que vous gardez"
      figureNote="la durée de la garantie décennale"
    >
      <Heading level={2} tone="inverse">
        Le carnet de votre logement s’ouvre tout seul.
      </Heading>
      <Text tone="inverse-soft">
        Chaque chantier signé s’y range de lui-même : son suivi, ses documents, ses dates de
        garantie, et les entreprises déjà intervenues chez vous. Il s’ouvre à la signature de votre
        prochain devis — rien à créer, rien à retenir.
      </Text>
      <Text size="sm" tone="inverse-soft">
        Aucune inscription, et aucune liste d’attente : nous ne collectons pas votre adresse avant
        qu’un devis ne vous soit adressé.
      </Text>
    </InkBand>
  )
}
