import Link from 'next/link'
import { Heading } from '@/ui/atoms/heading'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { format, type Cents } from '@/domain/money'

/**
 * L'argent en cours, d'une seule barre.
 *
 * **Aucune carte, et c'est la decision du composant.** Trois cartes de
 * statistiques decouperaient le flux en trois faits sans rapport ; la largeur
 * de chaque segment dit ce que le chiffre seul ne dit pas — ce qui bloque se
 * voit avant d'etre lu.
 *
 * La terre cuite va au premier segment, celui qui attend un geste de l'artisan,
 * jamais a l'encaisse : l'accent designe ce qui bloque, pas ce qui est fini.
 *
 * Le retard est hachure ET rouge : la couleur seule ne porte pas l'information.
 */
export interface MoneySegment {
  label: string
  amountInclTax: Cents
  note: string
  href: string
  fill: 'brand' | 'muted' | 'late'
}

const BAR = {
  brand: 'bg-brand',
  muted: 'bg-ink-soft/45',
  late: 'bg-danger bg-[repeating-linear-gradient(-45deg,transparent_0_4px,var(--dq-hatch)_4px_8px)]',
} as const

const SWATCH = {
  brand: 'bg-brand',
  muted: 'bg-ink-soft/45',
  late: 'bg-danger',
} as const

/**
 * Plancher de largeur d'un segment, en px.
 *
 * `flexGrow` seul distribue la largeur au prorata du montant : avec des
 * proportions realistes (99 % en carnet signe, 0,1 % en retard), le segment
 * en retard se rend a 0,3px — invisible et injoignable, alors que c'est
 * precisement l'argent qui bloque que le composant existe pour montrer.
 *
 * La valeur vaut la hauteur de la barre (`h-[18px]` ci-dessous) : assez pour
 * rester un carre reconnaissable et cliquable a la souris, pas plus — un
 * segment de barre n'est pas un bouton, il n'a pas a viser les 44px de cible
 * tactile du reste du depot. Applique via `min-width`, pas `flex-basis` : le
 * plancher ne joue que pour les montants qui en ont besoin, les autres
 * segments se partagent le reste au prorata sans que leurs proportions
 * relatives ne soient faussees.
 */
const MIN_SEGMENT_WIDTH = 18

export function MoneyFlow({
  totalInclTax,
  caption,
  segments,
  context,
}: {
  totalInclTax: Cents
  caption: string
  segments: MoneySegment[]
  /**
   * Un repere, pas un resultat.
   *
   * L'encaisse sur 12 mois sort de la barre : a l'echelle reelle il occupe les
   * trois quarts de la largeur et ecrase les deux segments qui appellent un
   * geste. Il reste ici, a droite du total et nettement plus discret que lui.
   */
  context?: { amountInclTax: Cents; caption: string }
}) {
  const total = segments.reduce((sum, segment) => sum + segment.amountInclTax, 0)

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Heading level="display" as="p">
            <Money cents={totalInclTax} emphasis="strong" testId="money-in-flight" />
          </Heading>
          <Text size="sm" tone="muted" as="p">
            {caption}
          </Text>
        </div>

        {context ? (
          // A gauche tant que le bloc est empile sous le total, a droite des
          // qu'il se pose a cote : aligne a droite en toutes largeurs, le
          // montant flottait loin de sa legende sur un telephone.
          <div className="sm:text-right">
            <Text size="sm" as="p">
              <Money cents={context.amountInclTax} />
            </Text>
            <Text size="sm" tone="muted" as="p">
              {context.caption}
            </Text>
          </div>
        ) : null}
      </div>

      {total === 0 ? null : (
        <div className="flex h-[18px] w-full gap-0.5">
          {segments.map((segment) =>
            segment.amountInclTax === 0 ? null : (
              <Link
                key={segment.label}
                href={segment.href}
                // Le lien EST le segment : sa largeur porte le montant, mais
                // elle est inaccessible au lecteur d'ecran. Le nom accessible
                // doit donc porter les deux — la categorie et la somme —,
                // sinon "Signe, pas encore facture" s'enonce sans jamais dire
                // combien.
                aria-label={`${segment.label} : ${format(segment.amountInclTax)} €`}
                style={{ flexGrow: segment.amountInclTax, minWidth: MIN_SEGMENT_WIDTH }}
                className={`rounded-badge ${BAR[segment.fill]}`}
              />
            ),
          )}
        </div>
      )}

      <div className="grid gap-10 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex flex-col gap-2 border-t border-rule pt-4">
            <div className="flex items-center gap-2">
              <span aria-hidden className={`size-[7px] shrink-0 ${SWATCH[segment.fill]}`} />
              <Text size="sm" tone="muted" as="span">
                {segment.label}
              </Text>
            </div>
            <Money cents={segment.amountInclTax} emphasis="strong" />
            <Text size="sm" tone="muted" as="p">
              {segment.note}
            </Text>
          </div>
        ))}
      </div>
    </section>
  )
}
