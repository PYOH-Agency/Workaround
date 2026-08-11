import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Reveal } from '@/ui/molecules/reveal'
import { RevealTick } from '@/ui/molecules/reveal-tick'
import { SiretLookup } from '@/ui/organisms/siret-lookup'
import { Checking } from './checking'

/**
 * L'accroche du demandeur.
 *
 * Elle tenait sur une seule colonne, et la moitie droite de l'ecran restait
 * vide la ou la page pro porte sa scene. Ce vide se lisait : la page de
 * l'artisan paraissait soignee, celle du client bacle — sur le public qui,
 * justement, arrive sans rien connaitre de nous et decide s'il nous fait
 * confiance en trois secondes.
 *
 * `Checking` comble ce vide et fait le meme travail que `Squaring` cote pro :
 * elle ne decore pas la promesse, elle la joue.
 */
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      {/* Le seul `Reveal` de la page : c'est le bloc qui porte la promesse. */}
      <Reveal>
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_1fr] md:gap-16">
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

          <div className="flex justify-center md:justify-end">
            <Checking />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
