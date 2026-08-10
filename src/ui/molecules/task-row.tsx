import { ButtonLink } from '@/ui/atoms/button-link'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import type { Cents } from '@/domain/money'

/**
 * Une ligne de la file d'accueil : quand, quoi, et le geste.
 *
 * Distincte de `RailItem`, qui porte une suite chronologique : celle-ci n'a
 * aucun ordre a signifier, mais une colonne d'action et une colonne de montant.
 *
 * Le carre vient de la marque, comme sur le filet — 7 px, et 9 px en terre
 * cuite quand la ligne est la plus urgente. La couleur ne porte jamais seule :
 * l'urgence est aussi dite par le libelle et par la position.
 */
export function TaskRow({
  when,
  title,
  detail,
  amountInclTax = null,
  href,
  action,
  urgent = false,
  solid = false,
}: {
  /** « 18 j », « dans 21 j ». Deja formate : la molecule ne calcule rien. */
  when: string
  title: string
  detail: string
  amountInclTax?: Cents | null
  href: string
  /** Le verbe. « Relancer », « Facturer » — jamais « Voir ». */
  action: string
  urgent?: boolean
  /**
   * Le bouton plein. **Un seul par ecran** : l'echeance dont le cout est
   * irreversible. Les autres lignes restent en `raised`.
   */
  solid?: boolean
}) {
  return (
    <li className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-x-5 gap-y-3 border-b border-rule py-5 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto]">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={
            urgent ? 'size-[9px] shrink-0 bg-brand' : 'size-[7px] shrink-0 bg-ink-muted'
          }
        />
        <Text size="sm" tone={urgent ? 'soft' : 'muted'} as="span">
          {when}
        </Text>
      </div>

      <div className="min-w-0">
        <Text as="p">{title}</Text>
        <Text size="sm" tone="muted" as="p">
          {detail}
        </Text>
      </div>

      <div className="col-start-2 flex items-center gap-4 sm:col-start-3">
        {amountInclTax === null ? null : <Money cents={amountInclTax} />}
        <ButtonLink href={href} tone={solid ? 'primary' : 'raised'}>
          {action}
        </ButtonLink>
      </div>
    </li>
  )
}
