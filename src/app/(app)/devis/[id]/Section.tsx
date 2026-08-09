import { Heading } from '@/ui/atoms/heading'

/**
 * Une etape de la vie du devis.
 *
 * `level={3}` porte l'apparence — un titre de section n'a pas a peser autant
 * que le numero du devis — et `as="h2"` la semantique : ce sont bien les
 * divisions de premier rang de la page, et un lecteur d'ecran doit pouvoir
 * sauter de l'une a l'autre.
 *
 * Local a cet ecran, et non promu dans le design system : tant qu'une seule
 * page en a besoin, un composant partage serait un inventaire qui grossit sans
 * qu'aucun deuxieme usage l'ait demande.
 */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Heading level={3} as="h2">
        {title}
      </Heading>
      {children}
    </section>
  )
}
