import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { ONBOARDING_HREF } from '../onboarding-href'

/**
 * Ce que ça coute.
 *
 * Le pendant clair de la section « mentions » : la meme mise en scene — un
 * chiffre qui pese, adosse a un filet —, mais en vert verifie. « 0 € » face au
 * « 15 000 € » de l'amende evitee : les deux chiffres qui encadrent la
 * promesse, et disent d'un coup d'oeil de quel cote se ranger.
 */
export function Pricing() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,auto)_1fr] md:items-center md:gap-16">
          <div className="flex flex-col gap-2 border-l-4 border-verified pl-6">
            <Text size="label" tone="muted">
              Ce que ça coûte
            </Text>
            <Heading level="figure" as="p">
              0 €
            </Heading>
            <Text size="sm" tone="muted">
              à vie, sans limite de volume
            </Text>
          </div>

          <div className="flex flex-col items-start gap-4">
            <Heading level={2}>Devis, factures, signature, page publique : gratuits pour toujours.</Heading>
            <Text tone="soft">
              L’abonnement Pro ne concerne que ce qui vient après — l’équipe et les situations de
              travaux ligne par ligne.
            </Text>
            <ButtonLink href={ONBOARDING_HREF} size="lg">
              Commencer
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
