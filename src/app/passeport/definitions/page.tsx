import type { Metadata } from 'next'
import { MINIMUM_OBSERVATIONS, WINDOW_MONTHS } from '@/domain/passport-metrics'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { PublicShell } from '@/ui/shells/public-shell'

export const metadata: Metadata = {
  title: 'Comment les chiffres du passeport sont calculés',
  description:
    'La règle de calcul de chaque indicateur, ce sur quoi il porte, et ce qu’il ne dit pas.',
}

/**
 * Les definitions publiques.
 *
 * Exigees par l'AIPD : un chiffre dont on ignore la regle de calcul est
 * incontestable, donc arbitraire — et un droit de rectification qu'on ne peut
 * pas exercer faute de comprendre le calcul n'est pas un droit.
 */
const METRICS = [
  {
    label: 'Facturé au prix annoncé',
    measures:
      'La part des chantiers dont le total facturé n’a pas dépassé le devis initial, au centime près.',
    method:
      'On compare la somme de toutes les factures — avoirs déduits, avenants compris — au montant du tout premier devis signé. Un chantier rattrapé par avenant compte donc comme un dépassement.',
    silent:
      'Un avenant peut être parfaitement légitime : le client a demandé plus. L’indicateur ne dit pas qui a voulu le supplément, seulement que le prix final s’est éloigné de celui annoncé.',
  },
  {
    label: 'Délai annoncé respecté',
    measures:
      'La part des chantiers terminés dans le délai engagé sur le devis, compté en jours ouvrés.',
    method:
      'Du jour de la signature au jour de fin du chantier, samedis et dimanches exclus. La fin est la date d’émission de la facture de solde, ou celle que l’entreprise a déclarée.',
    silent:
      'Les jours fériés ne sont pas décomptés, et un retard causé par le client ou par un autre corps d’état est compté comme un retard.',
  },
]

export default function DefinitionsPage() {
  return (
    <PublicShell variant="plain">
      <div className="flex flex-col gap-3">
        <Heading level={1}>Comment ces chiffres sont calculés</Heading>
        <Text tone="soft">
          Un chiffre dont on ignore la règle de calcul ne peut pas être contesté. Voici donc
          exactement ce que chacun mesure — et ce qu’il ne mesure pas.
        </Text>
      </div>

      {/*
        La mention de perimetre n'est pas une precaution : c'est une correction.
        Le lecteur suppose « voici comment travaille cette entreprise » tant
        qu'on ne lui dit pas le contraire.
      */}
      <Card elevation="e1">
        <div className="flex flex-col gap-1">
          <Text size="label" tone="muted">
            Sur quoi ces chiffres portent
          </Text>
          <Text>
            <strong>Sur les chantiers passés par cet outil</strong>, et sur eux seuls. Une
            entreprise peut travailler par ailleurs sans que rien n’apparaisse ici. C’est pourquoi
            le nombre de chantiers est toujours affiché à côté de chaque pourcentage : il dit sur
            quoi le chiffre porte.
          </Text>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {METRICS.map((metric) => (
          <Card key={metric.label} elevation="e1">
            <div className="flex flex-col gap-2">
              <Heading level={3} as="h2">
                {metric.label}
              </Heading>
              <Text size="sm">{metric.measures}</Text>
              <Text size="sm" tone="soft">
                <strong>Comment.</strong> {metric.method}
              </Text>
              <Text size="sm" tone="muted">
                <strong>Ce qu’il ne dit pas.</strong> {metric.silent}
              </Text>
            </div>
          </Card>
        ))}
      </div>

      <Card elevation="flat">
        <div className="flex flex-col gap-1">
          <Text size="label" tone="muted">
            Deux règles communes
          </Text>
          <Text size="sm" tone="soft">
            Les chiffres portent sur les <strong>{WINDOW_MONTHS} derniers mois</strong> : un bon
            historique ne doit pas masquer une dégradation récente.
          </Text>
          <Text size="sm" tone="soft">
            En dessous de <strong>{MINIMUM_OBSERVATIONS} chantiers</strong>, aucun pourcentage
            n’est affiché — trois chantiers parfaits ne disent rien de plus que trois chantiers.
          </Text>
        </div>
      </Card>
    </PublicShell>
  )
}
