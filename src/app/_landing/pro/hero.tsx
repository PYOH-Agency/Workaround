import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Reveal } from '@/ui/molecules/reveal'
import { RevealTick } from '@/ui/molecules/reveal-tick'
import { ONBOARDING_HREF } from '../onboarding-href'

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      {/* Le seul `Reveal` de la page : c'est le bloc qui porte la promesse. */}
      <Reveal>
        <div className="flex flex-col gap-5">
          <Heading level="display">
            Vos devis et vos factures, gratuits à vie.
            <RevealTick />
          </Heading>
          <div className="max-w-[52ch]">
            <Text tone="soft">
              Conformes aux mentions obligatoires du bâtiment, signés par vos clients en deux
              minutes. Et une page publique qui prouve que votre assurance est à jour.
            </Text>
          </div>
          <div className="flex flex-col gap-2">
            <ButtonLink href={ONBOARDING_HREF} size="lg">
              Commencer
            </ButtonLink>
            <Text size="sm" tone="muted">
              Trente secondes. Aucune carte bancaire.
            </Text>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
