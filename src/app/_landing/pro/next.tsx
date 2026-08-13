import { Text } from '@/ui/atoms/text'
import { SectionHeader } from '@/ui/molecules/section-header'

/**
 * Texte provisoire, a relire : point ouvert n°3 du §10 de la spec landing.
 * Le principe est arrete (une direction, sans date, encadree par la regle
 * enoncee juste au-dessus) — la formulation exacte ne l'est pas.
 *
 * L'horizon en pied de section dit en image ce que la derniere phrase dit en
 * mots : une direction, pas une date. Le carre terre cuite — le point de
 * depart, l'aujourd'hui — puis un filet pointille qui part vers un « a venir »
 * sans terme. Decoratif, dans le vocabulaire du plan.
 */
export function Next() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12">
      <SectionHeader
        layout="split"
        label="La suite"
        title="Vous mettre en relation avec de nouveaux clients."
        lead="Nous voulons aider de nouveaux clients à vous trouver, au-delà de ceux qui vous connaissent déjà. Cette mise en relation suivra les deux mêmes règles que ci-dessus : jamais de classement acheté, jamais de commission sur vos propres clients. C’est une direction, pas une date."
      />

      <div aria-hidden="true" className="mt-10 flex items-center gap-4">
        <span className="h-3 w-3 shrink-0 bg-brand" />
        <span className="h-0 flex-1 border-t border-dashed border-rule" />
        <Text size="label" tone="muted" as="span">
          à venir
        </Text>
      </div>
    </section>
  )
}
