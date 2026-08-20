import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { RevealTick } from '@/ui/molecules/reveal-tick'
import entrance from '../hero-entrance.module.css'
import { ONBOARDING_HREF } from '../onboarding-href'
import { HeroScene } from './hero-scene'

/** Le rang d'un element dans l'ouverture. Voir `hero-entrance.module.css`. */
const rank = (i: number) => ({ '--dq-i': i }) as React.CSSProperties

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
 *
 * **L'ouverture n'est plus un `Reveal`.** Le geste de marque portait le bloc
 * entier : six elements arrivaient ensemble, et l'accroche s'affichait d'un
 * coup. Elle se compose desormais dans l'ordre ou on la lit — l'etiquette, les
 * trois lignes du titre l'une apres l'autre, le chapeau, l'action —, pendant
 * que la scene joue sa propre chronologie a cote.
 */
export function Hero() {
  return (
    <section className="dq-sheet">
      <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 md:grid-cols-[1.15fr_1fr] md:gap-16">
          <div className="flex flex-col gap-6">
            <div className={entrance.step} style={rank(0)}>
              <Text size="label" tone="muted">
                Pour les artisans du bâtiment
              </Text>
            </div>

            {/*
              Une ligne, un balayage. La coupe est ecrite a la main plutot que
              laissee au navigateur : c'est elle qui donne son rythme a
              l'ouverture, et un retour automatique la ferait varier d'une
              largeur d'ecran a l'autre.
            */}
            <Heading level="hero">
              <span className={entrance.line} style={rank(0)}>
                Vos devis
              </span>
              <span className={entrance.line} style={rank(1)}>
                et vos factures,
              </span>
              <span className={entrance.line} style={rank(2)}>
                gratuits à vie.
                <RevealTick />
              </span>
            </Heading>

            <div className={`${entrance.step} max-w-[52ch]`} style={rank(3)}>
              <Text tone="soft">
                Conformes aux mentions obligatoires du bâtiment, signés par vos clients en deux
                minutes. Et une page publique qui prouve que votre assurance est à jour.
              </Text>
            </div>

            {/*
              `sm:items-start` : pleine largeur sur telephone, ou un bouton qui
              barre l'ecran se vise sans regarder ; ajuste a son texte des qu'il
              y a de la place, un appel a l'action de 1 200 px ne ressemblant a
              rien.
            */}
            <div className={`${entrance.step} flex flex-col gap-2 sm:items-start`} style={rank(4)}>
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
      </div>
    </section>
  )
}
