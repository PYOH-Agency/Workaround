import { Card } from '@/ui/molecules/card'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'

export interface Slot {
  id: string
  time: string
  label: string
  place: string
}

/**
 * Deux jours, pas la semaine.
 *
 * Au-dela ce n'est plus une urgence mais une consultation, et l'agenda existe
 * pour ca. Une journee vide le dit — un ecran muet laisse croire a une panne.
 *
 * `Heading` ne connait que les niveaux `hero`, `display`, `1`, `2`, `3` : il
 * n'y a pas de palier plus petit que `3` pour distinguer visuellement
 * « Demain » d'« Aujourd'hui ». Les deux partagent donc le meme niveau
 * d'apparence ; c'est la balise (`h2` puis `h3`) qui porte la hierarchie.
 */
export function Today({ today, tomorrow }: { today: Slot[]; tomorrow: Slot[] }) {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <Heading level={3} as="h2">
          Aujourd’hui
        </Heading>
        <Day slots={today} />

        <Heading level={3} as="h3">
          Demain
        </Heading>
        <Day slots={tomorrow} />

        <Link href="/agenda" standalone>Ouvrir l’agenda</Link>
      </div>
    </Card>
  )
}

function Day({ slots }: { slots: Slot[] }) {
  if (slots.length === 0) {
    return (
      <Text size="sm" tone="muted" as="p">
        Rien de prévu.
      </Text>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {slots.map((slot) => (
        <li key={slot.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3">
          <Text size="sm" tone="soft" as="span">
            {slot.time}
          </Text>
          <div>
            <Text size="sm" as="p">
              {slot.label}
            </Text>
            <Text size="sm" tone="muted" as="p">
              {slot.place}
            </Text>
          </div>
        </li>
      ))}
    </ul>
  )
}
