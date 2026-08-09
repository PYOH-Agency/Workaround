import type { PublicActivity } from '@/services/public-profile'
import { DateText } from '@/ui/atoms/date-text'

const COVER = {
  decennale: 'Garantie décennale',
  rc_pro: 'RC professionnelle',
} as const

/**
 * On nomme l'assurance qui couvre chaque activite, et on la date.
 *
 * Un badge « assuré » indifferencie reproduirait le piege du secteur : c'est
 * precisement parce qu'un artisan peut etre assure pour une activite et pas
 * pour la voisine que ce produit existe.
 *
 * La date, elle, dit ce que nous savons **reellement**. Une attestation est un
 * constat a la date de son emission : le contrat qu'elle atteste peut etre
 * resilie le lendemain, pour non-paiement, sans que personne nous en informe.
 * Ecrire « assurance en cours de validite » au present affirmait donc l'etat du
 * contrat, que nous ignorons. Nommer le document, son echeance et la date ou
 * nous l'avons controle affirme exactement ce que nous avons verifie.
 *
 * Ce n'est pas une prudence qui affaiblit la promesse, c'est ce qui la rend
 * tenable — et une date verifiable est plus credible qu'une pastille verte.
 */
export function CoveredActivities({ activities }: { activities: PublicActivity[] }) {
  return (
    <ul className="flex flex-col divide-y divide-rule">
      {activities.map((item) => (
        <li key={item.code} className="flex flex-col gap-1 py-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span data-testid={`activite-${item.code}`} className="flex-1 text-ink">
              {item.label}
            </span>
            {/* `verified` et non `emerald-600` : ce dernier ne donnait que 3,38:1
                sur la surface claire, sous le 4,5:1 exige pour du texte de 14 px. */}
            <span className="text-verified">{COVER[item.coveredBy]}</span>
          </div>
          <span className="text-xs text-ink-muted">
            Attestation valable jusqu’au <DateText value={item.coveredUntil} format="short" />
            {item.checkedOn !== null && (
              <>
                {' · contrôlée le '}
                <DateText value={item.checkedOn} format="short" />
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
