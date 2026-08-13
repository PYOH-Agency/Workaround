import { Heading } from '@/ui/atoms/heading'

/**
 * Les engagements du §12 du socle, en manifeste.
 *
 * Ce n'est pas une mention de bas de page : pour un artisan demarche dix fois
 * par des vendeurs de leads, c'est le meilleur argument de la page — et aucun
 * concurrent ne peut ecrire ces phrases. Elles se lisent donc en gros, chacune
 * adossee au meme filet terre cuite que les chiffres de la vitrine : la page
 * parle d'une seule voix.
 *
 * `as="p"` : ce sont des affirmations, pas des titres. Elles portent l'allure
 * d'un titre sans trouer la hierarchie du document pour un lecteur d'ecran.
 */
export function PrinciplePanel({ principles }: { principles: string[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-6 md:grid-cols-2">
      {principles.map((principle) => (
        <li key={principle} className="border-l-4 border-brand pl-6">
          <Heading level={1} as="p">
            {principle}
          </Heading>
        </li>
      ))}
    </ul>
  )
}
