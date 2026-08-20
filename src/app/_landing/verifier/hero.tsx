import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { RevealTick } from '@/ui/molecules/reveal-tick'
import { SiretLookup } from '@/ui/organisms/siret-lookup'
import entrance from '../hero-entrance.module.css'
import { Checking } from './checking'

/** Le rang d'un element dans l'ouverture. Voir `hero-entrance.module.css`. */
const rank = (i: number) => ({ '--dq-i': i }) as React.CSSProperties

/**
 * L'accroche du demandeur.
 *
 * **Elle ne pose plus une question inquiete.** « Votre artisan est-il assure
 * pour ce qu'il va faire ? » etait juste, et c'etait tout ce que la page avait
 * a offrir : une mise en garde, puis un piege, puis un depannage. Un visiteur
 * qui n'a rien a verifier ce jour-la n'y trouvait rien — et un visiteur qui
 * avait quelque chose a verifier repartait des la reponse obtenue.
 *
 * Ce que le produit donne vraiment a ce public existe et est livre depuis M6 :
 * le suivi de chantier, les documents, les dates de garantie et le repertoire
 * des entreprises deja intervenues. C'est un carnet, il se tient tout seul, et
 * c'est cela qui se promet en accroche.
 *
 * **La verification reste l'action.** Elle n'est pas retrogradee : elle devient
 * le commencement de ce qu'on promet, ce qu'elle est reellement dans le
 * parcours. Le chapeau fait le pont en une phrase, et il dit sans detour a
 * quel moment le carnet s'ouvre — a la signature, pas ici. Promettre un espace
 * a qui vient de lire qu'on ne collecte rien serait le seul mensonge qu'une
 * page de confiance ne peut pas se permettre.
 *
 * `Checking` garde la seconde colonne : c'est le geste de l'action, et elle ne
 * finit pas sur « tout va bien » — voir son propre commentaire.
 */
export function Hero() {
  return (
    <section className="dq-sheet">
      <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 md:grid-cols-[1.15fr_1fr] md:gap-16">
          <div className="flex flex-col gap-6">
            <div className={entrance.step} style={rank(0)}>
              <Text size="label" tone="muted">
                Pour qui fait faire des travaux
              </Text>
            </div>

            <Heading level="hero">
              <span className={entrance.line} style={rank(0)}>
                Le carnet
              </span>
              <span className={entrance.line} style={rank(1)}>
                de votre logement,
              </span>
              <span className={entrance.line} style={rank(2)}>
                tenu tout seul.
                <RevealTick />
              </span>
            </Heading>

            <div className={`${entrance.step} max-w-[54ch]`} style={rank(3)}>
              <Text tone="soft">
                Suivi de chantier, factures, dates de garantie, entreprises déjà intervenues : tout
                s’y range à partir du devis que vous signez. Ça commence avant la signature — en
                vérifiant que l’entreprise est bien assurée pour ce qu’elle va faire.
              </Text>
            </div>

            <div className={entrance.step} style={rank(4)}>
              <SiretLookup
                entry="demandeur"
                tone="conversion"
                label="SIRET de l’entreprise"
                cta="Vérifier"
                hint="Gratuit, sans compte. Le SIRET figure sur son devis."
              />
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <Checking />
          </div>
        </div>
      </div>
    </section>
  )
}
