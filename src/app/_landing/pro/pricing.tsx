import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { InkBand } from '../ink-band'
import { ONBOARDING_HREF } from '../onboarding-href'

/**
 * Ce que ça coute, et la reprise de l'action.
 *
 * La seconde bande d'encre de la page, et sa derniere section : la meme mise en
 * scene que « ce que ça vous évite », le meme chiffre qui pese. « 0 € » repond
 * a « 15 000 € » — les deux nombres qui encadrent la promesse, et disent d'un
 * coup d'oeil de quel cote se ranger. Les faire rimer, c'est ce qui justifie
 * qu'ils partagent la seule couleur forte de la page.
 *
 * Le bouton passe en terre cuite : c'est l'exception du §5.4 de la charte —
 * page publique, une seule action, aucune action destructive alentour — et
 * c'est la seule couleur qui se detache franchement de l'encre.
 */
export function Pricing() {
  return (
    <InkBand figure="0 €" figureLabel="Ce que ça coûte" figureNote="à vie, sans limite de volume">
      <Heading level={2} tone="inverse">
        Devis, factures, signature, page publique : gratuits pour toujours.
      </Heading>
      <Text tone="inverse-soft">
        L’abonnement Pro ne concerne que ce qui vient après — l’équipe et les situations de travaux
        ligne par ligne.
      </Text>
      <ButtonLink href={ONBOARDING_HREF} tone="conversion" size="lg">
        Commencer
      </ButtonLink>
      <Text size="sm" tone="inverse-soft">
        Trente secondes. Aucune carte bancaire.
      </Text>
    </InkBand>
  )
}
