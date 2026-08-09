import { SectionHeader } from '@/ui/molecules/section-header'

/**
 * Texte provisoire, a relire : point ouvert n°3 du §10 de la spec landing.
 * Le principe est arrete (une direction, sans date, encadree par la regle
 * enoncee juste au-dessus) — la formulation exacte ne l'est pas.
 */
export function Next() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <SectionHeader
        label="La suite"
        title="Vous mettre en relation avec de nouveaux clients."
        lead="Nous voulons aider de nouveaux clients à vous trouver, au-delà de ceux qui vous connaissent déjà. Cette mise en relation suivra les deux mêmes règles que ci-dessus : jamais de classement acheté, jamais de commission sur vos propres clients. C’est une direction, pas une date."
      />
    </section>
  )
}
