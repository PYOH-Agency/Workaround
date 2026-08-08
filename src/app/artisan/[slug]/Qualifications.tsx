import type { Qualification } from '@/domain/rge'

/**
 * Le RGE n'est jamais affiche nu.
 *
 * C'est une liste datee par qualification : une entreprise peut etre RGE pour
 * le remplacement de chaudiere et pas pour l'isolation. Afficher « RGE » sans
 * dire pour quoi reproduirait exactement le piege de l'assurance.
 */
export function Qualifications({ qualifications }: { qualifications: Qualification[] }) {
  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {qualifications.map((item) => (
        <li key={item.code} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm">
          <span className="flex-1">{item.label}</span>
          {item.organisation && <span className="opacity-70">{item.organisation}</span>}
          <span className="opacity-60">
            jusqu’au {item.validUntil.toLocaleDateString('fr-FR')}
          </span>
        </li>
      ))}
    </ul>
  )
}
