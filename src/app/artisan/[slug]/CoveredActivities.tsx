import type { PublicActivity } from '@/services/public-profile'

const COVER = {
  decennale: 'Garantie décennale',
  rc_pro: 'RC professionnelle',
} as const

/**
 * On nomme l'assurance qui couvre chaque activite.
 *
 * Un badge « assuré » indifferencie reproduirait le piege du secteur : c'est
 * precisement parce qu'un artisan peut etre assure pour une activite et pas
 * pour la voisine que ce produit existe.
 */
export function CoveredActivities({ activities }: { activities: PublicActivity[] }) {
  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {activities.map((item) => (
        <li key={item.code} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm">
          <span data-testid={`activite-${item.code}`} className="flex-1">
            {item.label}
          </span>
          <span className="text-emerald-600">{COVER[item.coveredBy]}</span>
        </li>
      ))}
    </ul>
  )
}
