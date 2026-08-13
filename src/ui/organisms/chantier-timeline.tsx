import type { TimelineEntry, TimelineKind } from '@/domain/timeline'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Rail, RailItem } from '@/ui/molecules/rail'

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
 *
 * **Elle est posee sur `Rail` depuis la reprise des treize ecrans.** Une pile
 * de cartes ne disait pas qu'un evenement vient apres l'autre — elle montrait
 * six objets cote a cote. Le filet le dit, et rend deux fois plus d'entrees
 * lisibles a hauteur d'ecran constante.
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
    <Rail testId="fil">
      {entries.map((entry, index) => (
        <RailItem
          key={`${entry.kind}-${entry.at.toISOString()}-${index}`}
          // `buildTimeline` trie du plus ANCIEN au plus recent : l'etat courant
          // du chantier est donc le dernier element, et c'est lui que le carre
          // terre cuite designe. Marquer le premier aurait pointe le devis
          // signe — l'evenement le plus vieux du dossier.
          current={index === entries.length - 1}
        >
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
                {entry.photoPaths.map((path, photoIndex, all) =>
                  photoUrls[path] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={path}
                      src={photoUrls[path]}
                      // Ces photos montrent l'avancement : elles portent une
                      // information, `alt=""` les cachait au lecteur d'ecran. Le
                      // texte de l'entree en donne la date et la nature juste
                      // au-dessus ; l'alt situe la photo et numerote les
                      // multiples pour qu'elles ne se confondent pas.
                      alt={
                        all.length > 1
                          ? `Photo du chantier, ${entry.at.toLocaleDateString('fr-FR')} (${photoIndex + 1} sur ${all.length})`
                          : `Photo du chantier, ${entry.at.toLocaleDateString('fr-FR')}`
                      }
                      className="h-28 w-28 rounded-card object-cover"
                    />
                  ) : null,
                )}
              </div>
            )}
          </div>
        </RailItem>
      ))}
    </Rail>
  )
}
