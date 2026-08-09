import type { Qualification } from '@/domain/rge'
import { DateText } from '@/ui/atoms/date-text'
import { Text } from '@/ui/atoms/text'

/**
 * Le RGE n'est jamais affiche nu.
 *
 * C'est une liste datee par qualification : une entreprise peut etre RGE pour
 * le remplacement de chaudiere et pas pour l'isolation. Afficher « RGE » sans
 * dire pour quoi reproduirait exactement le piege de l'assurance.
 */
export function Qualifications({ qualifications }: { qualifications: Qualification[] }) {
  return (
    /*
      Les tons passent par `Text` plutot que par `opacity` : une opacite baisse
      le contraste d'une quantite qu'aucun jeton ne connait, donc que le controle
      de contraste ne peut pas verifier. `soft` et `muted` sont, eux, calcules.
    */
    <ul className="flex flex-col divide-y divide-rule">
      {qualifications.map((item) => (
        <li key={item.code} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
          <span className="flex-1">
            <Text size="sm" as="span">
              {item.label}
            </Text>
          </span>
          {item.organisation && (
            <Text size="sm" tone="soft" as="span">
              {item.organisation}
            </Text>
          )}
          <Text size="sm" tone="muted" as="span">
            jusqu’au <DateText value={item.validUntil} format="short" />
          </Text>
        </li>
      ))}
    </ul>
  )
}
