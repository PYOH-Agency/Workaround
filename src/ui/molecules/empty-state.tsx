import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Un ecran vide dit toujours quoi faire ensuite.
 *
 * `action` est requis, ce n'est pas un oubli d'`?` : un vide sans porte de
 * sortie est un cul-de-sac, et c'est precisement l'ecran que voit un artisan a
 * sa premiere connexion.
 */
export function EmptyState({
  title,
  description,
  illustration,
  action,
}: {
  title: string
  description: string
  /**
   * A quoi ressemble ce qui manque — l'apercu, jamais la donnee.
   *
   * **Facultative, et c'est la decision** (spec A2 §5) : la plupart des vides
   * n'ont rien a enseigner. Une file d'attestations vide est une bonne
   * nouvelle, pas une lecon, et lui coller un dessin ferait passer un etat sain
   * pour un manque.
   *
   * Ce qu'on y met est statique par construction : aucune donnee fictive
   * n'entre en base (spec §2.2), donc rien de ce qui est montre ici ne peut
   * remonter dans le passeport ni partir a un client par erreur.
   */
  illustration?: React.ReactNode
  action: React.ReactNode
}) {
  return (
    <Card elevation="flat">
      {/*
        L'apercu A COTE du texte des qu'il y a la place, sous lui autrement : en
        375 px une colonne de plus rendrait les deux illisibles. `items-start`
        et non `items-center` — l'apercu se cale sur le titre, pas sur le milieu
        d'un bloc dont la hauteur depend de la longueur du paragraphe.
      */}
      <div className="flex flex-col gap-6 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-start gap-3">
          <Heading level={3} as="p">
            {title}
          </Heading>
          <Text tone="soft">{description}</Text>
          <div className="mt-2">{action}</div>
        </div>
        {illustration ? <div className="shrink-0">{illustration}</div> : null}
      </div>
    </Card>
  )
}
