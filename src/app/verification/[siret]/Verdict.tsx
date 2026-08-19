import type { VerificationView } from '@/services/verification-view'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { Notice } from '@/ui/molecules/notice'

/**
 * Le constat d'une absence, et rien d'autre.
 *
 * Trois regles, et ce fichier est precisement celui ou un futur contributeur
 * sera tente de les enfreindre.
 *
 * 1. **Aucune coche verte nulle part** : ni « etablissement actif », ni RGE, ni
 *    score, ni badge. La page ne peut qu'identifier ou alerter, jamais rassurer.
 *    Toute proposition d'y ajouter un signal positif est une regression, pas un
 *    enrichissement — trois coches vertes suivies d'un silence sur la decennale
 *    reproduiraient exactement le piege que `/verifier` denonce sur une page
 *    entiere. C'est pourquoi le ton `verified` de `Notice` et le pictogramme
 *    `check` n'apparaissent pas ici, et ne doivent jamais y apparaitre.
 * 2. **Aucune phrase ne mentionne l'appartenance a D'equerre**, ni pour la nier,
 *    ni pour la confirmer, ni pour l'adoucir. Un inscrit sans couverture et un
 *    inconnu lisent le meme ecran — c'est ce que verrouille
 *    `tests/services/verification-indistinction.test.ts`. Une page qui dirait
 *    « cette entreprise n'est pas inscrite chez nous » revelerait une
 *    appartenance a n'importe quel tiers muni d'un SIRET.
 * 3. **Jamais indexee** : voir `page.tsx` et `src/app/robots.ts`.
 *
 * L'ordre des blocs est le message : les alertes d'abord si elles existent,
 * puis le verdict, puis l'identite, puis la mise en garde sur le silence. Une
 * alerte reléguee sous une carte d'identite se lirait comme un detail.
 *
 * Le verdict ne dit pas « cette entreprise n'est pas assuree » — ce serait faux,
 * et diffamatoire. Il dit ce que NOUS pouvons affirmer, c'est-a-dire rien.
 */
export function Verdict({ view }: { view: VerificationView }) {
  const identity = view.identity

  return (
    <div className="flex flex-col gap-6">
      {/*
        Les signalements des registres passent avant tout le reste. `alert`
        reste faux : c'est une mise en garde permanente de la page, pas une
        erreur qui vient de survenir — la poser ferait interrompre le lecteur
        d'ecran a chaque navigation.
      */}
      {view.alerts.map((alert) => (
        <Notice key={alert.kind} tone="danger" testId={`alert-${alert.kind}`}>
          <Text size="sm">{alert.label}</Text>
          <Text size="sm">Ce signalement provient des registres publics.</Text>
        </Notice>
      ))}

      <Card>
        <div className="flex flex-col gap-3">
          <Heading level={2} as="h1">
            Nous ne pouvons rien affirmer sur l’assurance de cette entreprise.
          </Heading>
          <Text tone="soft">
            Aucune attestation vérifiée ne nous a été transmise. Une garantie décennale ne figure
            dans aucun registre public : seule l’attestation de l’assureur la nomme, activité par
            activité.
          </Text>
          <Text size="sm" tone="muted">
            SIRET {view.siret}
          </Text>
        </div>
      </Card>

      {/*
        Absent des registres et registres muets sont deux choses distinctes, et
        les confondre trompe dans les deux sens : l'un invite a relire les
        chiffres, l'autre a revenir plus tard.
      */}
      {view.unknownSiret && (
        <Notice tone="warning" testId="unknown-siret">
          <Text size="sm">Aucune entreprise ne porte ce numéro au répertoire des entreprises.</Text>
          <Text size="sm">Vérifiez les chiffres du SIRET.</Text>
        </Notice>
      )}

      {view.registryUnavailable && (
        <Notice tone="warning" testId="registry-unavailable">
          <Text size="sm">Les registres publics n’ont pas répondu.</Text>
          <Text size="sm">
            Nous n’avons pas pu identifier cette entreprise. Réessayez dans un moment.
          </Text>
        </Notice>
      )}

      {view.alertsUnavailable && (
        <Notice tone="warning" testId="alerts-unavailable">
          <Text size="sm">Le BODACC n’a pas répondu.</Text>
          <Text size="sm">
            Nous ne savons pas si une procédure collective a été publiée pour cette entreprise.
          </Text>
        </Notice>
      )}

      {identity && (
        <Card elevation="flat">
          <div className="flex flex-col gap-1">
            {/* Ce que le repertoire public dit, et rien d'autre : pas d'adresse
                complete, pas de TVA, pas d'etat administratif. */}
            <Text size="label" tone="muted">
              Au répertoire des entreprises
            </Text>
            <Heading level={3} as="h2">
              {identity.legalName}
            </Heading>
            <Text size="sm" tone="soft">
              {[identity.legalFormLabel, identity.city].filter(Boolean).join(' · ')}
            </Text>
            {identity.foundedOn && (
              <Text size="sm" tone="muted">
                Créée le <DateText value={identity.foundedOn} />
              </Text>
            )}
          </div>
        </Card>
      )}

      <Text size="sm" tone="muted">
        L’absence d’alerte ne signifie pas que tout va bien. Nous n’affichons que ce que les
        registres signalent.
      </Text>
    </div>
  )
}
