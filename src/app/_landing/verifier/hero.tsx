import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Reveal } from '@/ui/molecules/reveal'
import { RevealTick } from '@/ui/molecules/reveal-tick'
import { SiretLookup } from '@/ui/organisms/siret-lookup'

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      {/* Le seul `Reveal` de la page : c'est le bloc qui porte la promesse. */}
      <Reveal>
        <div className="flex flex-col gap-5">
          <Heading level="display">
            Votre artisan est-il assuré pour ce qu’il va faire ?
            <RevealTick />
          </Heading>
          <div className="max-w-[52ch]">
            <Text tone="soft">
              Une assurance décennale ne couvre que les activités qu’elle nomme. Entrez le SIRET
              de l’entreprise : nous affichons ce qui est couvert, et ce qui ne l’est pas.
            </Text>
          </div>
          <SiretLookup
            tone="conversion"
            label="SIRET de l’entreprise"
            cta="Vérifier"
            hint="Gratuit, sans compte. Le SIRET figure sur son devis."
          />
        </div>
      </Reveal>
    </section>
  )
}
