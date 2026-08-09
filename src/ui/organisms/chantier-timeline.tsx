import type { TimelineEntry, TimelineKind } from '@/domain/timeline'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * La chronologie d'un chantier, rendue a l'identique des DEUX cotes.
 *
 * Elle vit dans le design system et non dans l'un des deux ecrans : le client
 * et l'entreprise doivent lire la meme chose, et un composant loge d'un cote
 * obligerait l'autre a importer une fonctionnalite voisine — ce que
 * l'autonomie des fonctionnalites interdit, a raison : deux copies
 * divergeraient.
 *
 * Le domaine rend un `kind` ; l'ecran le traduit.
 *
 * Le francais vit ici parce que le libelle s'accompagne d'un montant formate,
 * qui est une affaire d'affichage — pas parce que le domaine s'interdirait le
 * francais, il en porte ailleurs.
 */
const LABELS: Record<TimelineKind, string> = {
  quote_signed: 'Devis signé',
  amendment_signed: 'Avenant signé',
  invoice_deposit: 'Acompte demandé',
  invoice_progress: 'Situation de travaux',
  invoice_balance: 'Solde demandé',
  invoice_credit_note: 'Avoir émis',
  payment: 'Paiement reçu',
  appointment: 'Rendez-vous',
  completed: 'Chantier terminé',
  post: '',
}

export function ChantierTimeline({
  entries,
  photoUrls,
}: {
  entries: TimelineEntry[]
  photoUrls: Record<string, string>
}) {
  return (
    <ol className="flex flex-col gap-4" data-testid="fil">
      {entries.map((entry, index) => (
        <li key={`${entry.kind}-${entry.at.toISOString()}-${index}`}>
          <Card elevation="e1">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Text size="label" tone="muted" as="span">
                  {entry.at.toLocaleDateString('fr-FR')}
                </Text>
                <Text as="span">
                  {entry.kind === 'amendment_signed'
                    ? `Avenant n° ${entry.version! - 1} signé`
                    : LABELS[entry.kind]}
                </Text>
                {entry.amountInclTax !== undefined && (
                  <span className="ml-auto">
                    <Money cents={entry.amountInclTax} emphasis="strong" />
                  </span>
                )}
              </div>

              {entry.body && <Text size="sm">{entry.body}</Text>}

              {entry.photoPaths && entry.photoPaths.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.photoPaths.map((path) =>
                    photoUrls[path] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={path}
                        src={photoUrls[path]}
                        alt=""
                        className="h-28 w-28 rounded-card object-cover"
                      />
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ol>
  )
}
