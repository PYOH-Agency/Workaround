import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Reveal } from '@/ui/molecules/reveal'
import { RevealTick } from '@/ui/molecules/reveal-tick'
import { ONBOARDING_HREF } from '../onboarding-href'
import { HeroScene } from './hero-scene'

/**
 * L'accroche.
 *
 * La scene occupe la seconde colonne. Elle n'illustre pas la promesse, elle la
 * demontre : le devis arrive de travers, se met d'equerre sur l'outil, et
 * l'angle verifie s'appose. C'est le geste du metier, et c'est ce que le
 * produit fait — d'ou une figure tracee plutot qu'une capture d'ecran, qui
 * aurait parle du logiciel au lieu de parler du travail.
 *
 * Elle passe sous le texte des que la place manque : sur un telephone, une
 * illustration qui pousse l'appel a l'action hors de l'ecran coute plus qu'elle
 * ne rapporte.
 */
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      {/* Le seul `Reveal` de la page : c'est le bloc qui porte la promesse. */}
      <Reveal>
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_1fr] md:gap-16">
          <div className="flex flex-col gap-5">
            <Heading level="hero">
              Vos devis et vos factures, gratuits à vie.
              <RevealTick />
            </Heading>
            <div className="max-w-[52ch]">
              <Text tone="soft">
                Conformes aux mentions obligatoires du bâtiment, signés par vos clients en deux
                minutes. Et une page publique qui prouve que votre assurance est à jour.
              </Text>
            </div>
            {/*
              `sm:items-start` : pleine largeur sur telephone, ou un bouton qui
              barre l'ecran se vise sans regarder ; ajuste a son texte des qu'il y
              a de la place, un appel a l'action de 1 200 px ne ressemblant a rien.
            */}
            <div className="flex flex-col gap-2 sm:items-start">
              <ButtonLink href={ONBOARDING_HREF} size="lg">
                Commencer
              </ButtonLink>
              <Text size="sm" tone="muted">
                Trente secondes. Aucune carte bancaire.
              </Text>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <HeroScene />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
