'use client'

import { useRouter } from 'next/navigation'
import { Input } from '@/ui/atoms/input'

/**
 * Sauter directement a la semaine d'une date.
 *
 * La navigation ne se faisait que de proche en proche — « precedente »,
 * « suivante ». Retrouver un rendez-vous pris dans trois mois demandait douze
 * clics ; un chantier de l'an dernier, cinquante. Le selecteur de date natif
 * ouvre le calendrier du telephone, la ou une grille maison n'aurait pas sa
 * place sur cet ecran.
 *
 * `defaultValue` et non `value` : le champ affiche le lundi de la semaine vue,
 * mais c'est l'URL qui fait foi. La page se recharge a chaque saut, et le
 * serveur ramene le champ sur la bonne date — l'etat vit dans l'adresse, pas
 * ici.
 */
export function WeekJump({ defaultDay }: { defaultDay: string }) {
  const router = useRouter()

  return (
    <div className="w-40">
      <Input
        type="date"
        aria-label="Aller à la semaine d’une date"
        defaultValue={defaultDay}
        onChange={(event) => {
          const day = event.target.value
          if (day) router.push(`/agenda?semaine=${day}`)
        }}
      />
    </div>
  )
}
