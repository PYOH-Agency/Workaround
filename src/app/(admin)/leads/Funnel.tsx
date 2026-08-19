import type { Funnel as FunnelCounts } from '@/domain/lead-funnel'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { cn } from '@/ui/cn'

const number = new Intl.NumberFormat('fr-FR')

/**
 * Le taux d'une etape par rapport a celle dont elle procede.
 *
 * `null` sur un denominateur nul, et non `0 %` : un entonnoir vide est le cas
 * normal des premiers jours, et « 0 % » y accuserait la page d'echouer alors
 * que rien n'a encore ete tente.
 */
function rate(part: number, whole: number): string | null {
  if (whole === 0) return null
  return `${Math.round((part / whole) * 100)} %`
}

interface Step {
  label: string
  value: number
  rate: string | null
  /** Une etape qui detaille celle du dessus plutot que de lui succeder. */
  nested?: boolean
  /** L'etape dont le taux est la mesure du dispositif. */
  key?: boolean
}

/**
 * Les huit chiffres de l'entonnoir.
 *
 * **Le taux qui compte est celui des demandes, `sans couverture -> demandes`.**
 * C'est le seul que cet ecran produise : il dit si la page de verification
 * convainc un demandeur de reclamer l'attestation. Les trois suivants —
 * inscription, depot, publication — mesurent le circuit de revue interne, qu'on
 * lit deja sur l'ecran des attestations ; ils sont ici pour le contexte, pas
 * pour la decision. La mise en forme porte cette hierarchie a elle seule :
 * le taux des demandes est le seul rendu en pleine taille, avec son
 * denominateur nomme ; les autres restent en petit et en gris.
 *
 * La repartition par origine (`entry`) n'y figure pas : le champ n'a
 * aujourd'hui qu'une seule valeur, et « 100 % demandeur » se lirait comme une
 * information alors que ce n'est qu'un compte de formulaires.
 */
export function Funnel({ counts }: { counts: FunnelCounts }) {
  const steps: Step[] = [
    { label: 'Recherches', value: counts.lookups, rate: null },
    {
      label: 'dont sans couverture',
      value: counts.uncovered,
      rate: rate(counts.uncovered, counts.lookups),
      nested: true,
    },
    {
      label: 'Demandes',
      value: counts.requests,
      rate: rate(counts.requests, counts.uncovered),
      key: true,
    },
    { label: 'envoyées par nous', value: counts.sent, rate: null, nested: true },
    { label: 'copiées par le demandeur', value: counts.copied, rate: null, nested: true },
    {
      label: 'Inscriptions',
      value: counts.registered,
      rate: rate(counts.registered, counts.requests),
    },
    {
      label: 'Attestations déposées',
      value: counts.deposited,
      rate: rate(counts.deposited, counts.registered),
    },
    {
      label: 'Couvertures publiées',
      value: counts.covered,
      rate: rate(counts.covered, counts.deposited),
    },
  ]

  return (
    <Card elevation="e1" as="section">
      <Heading level={3} as="h2">
        L’entonnoir
      </Heading>

      <dl className="mt-4 grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 gap-y-2">
        {steps.map((step) => (
          <div key={step.label} className="col-span-3 grid grid-cols-subgrid items-baseline">
            <Text
              as="dt"
              size={step.nested ? 'sm' : 'md'}
              tone={step.nested ? 'muted' : 'default'}
            >
              <span className={cn(step.nested && 'pl-4')}>{step.label}</span>
            </Text>

            <Text as="dd" size={step.nested ? 'sm' : 'md'} tone={step.nested ? 'muted' : 'default'}>
              <span className="tabular-nums">{number.format(step.value)}</span>
            </Text>

            {/*
              La troisieme colonne existe toujours, meme vide : les taux doivent
              s'aligner entre eux pour se comparer d'un coup d'oeil.
            */}
            <dd>
              {step.rate === null ? (
                <span aria-hidden="true" />
              ) : step.key ? (
                <Text as="span">
                  <span className="tabular-nums">{step.rate}</span> des sans-couverture
                </Text>
              ) : (
                <Text as="span" size="sm" tone="muted">
                  <span className="tabular-nums">{step.rate}</span>
                </Text>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
