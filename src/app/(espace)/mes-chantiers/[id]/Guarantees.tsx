import type { Deadline, GuaranteeKey } from '@/domain/guarantees'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { LiftReservesForm } from './LiftReservesForm'
import { ReceptionForm } from './ReceptionForm'

const NAMES: Record<GuaranteeKey, string> = {
  perfect_completion: 'Parfait achèvement',
  proper_function: 'Bon fonctionnement',
  decennial: 'Garantie décennale',
}

const asDay = (date: Date) => date.toISOString().slice(0, 10)

/**
 * Deux etats, et ils ne disent pas la meme chose.
 *
 * **Sans reception declaree, aucune date.** La reception est un acte du maitre
 * d'ouvrage, et nous ne l'etablissons pas a sa place : afficher une date que
 * nous n'avons pas constatee ferait manquer un delai de forclusion a celui
 * qu'elle protege.
 *
 * Une reception peut porter des reserves. Elle a alors bien lieu — les
 * garanties courent depuis sa date —, mais la retenue de garantie reste due au
 * client jusqu'a la levee des reserves, qu'il declare lui aussi.
 */
export function Guarantees({
  quoteId,
  deadlines,
  receivedAt,
  reserves,
  reservesLiftedAt,
  completed,
}: {
  quoteId: string
  deadlines: Deadline[] | null
  receivedAt: Date | null
  reserves: string | null
  reservesLiftedAt: Date | null
  completed: boolean
}) {
  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-3" data-testid="garanties">
        <Heading level={3} as="h2">
          Vos garanties
        </Heading>

        {deadlines === null ? (
          <Text size="sm" tone="soft">
            Elles courent à partir de la <strong>réception des travaux</strong> — un acte de votre
            part, avec ou sans réserves, une fois que vous avez pris possession de l’ouvrage.{' '}
            <strong>Nous ne pouvons pas la constater à votre place.</strong>{' '}
            {completed
              ? 'Indiquez-en la date pour voir vos échéances.'
              : 'Vous pourrez en indiquer la date une fois le chantier terminé.'}
          </Text>
        ) : (
          <>
            <dl className="flex flex-col gap-2">
              {deadlines.map((deadline) => (
                <div key={deadline.key} className="flex flex-wrap justify-between gap-2">
                  <Text size="sm" tone="muted" as="dt">
                    {NAMES[deadline.key]} · {deadline.article}
                  </Text>
                  <Text size="sm" as="dd">
                    jusqu’au {deadline.endsAt.toLocaleDateString('fr-FR')}
                  </Text>
                </div>
              ))}
            </dl>
            <Text size="sm" tone="muted">
              Date déclarée par vos soins ({receivedAt!.toLocaleDateString('fr-FR')}).{' '}
              <strong>Elle n’engage pas les parties</strong> : en cas de litige, c’est la réception
              réellement intervenue qui compte.
            </Text>

            {reserves !== null && (
              <div className="flex flex-col gap-2 rounded-card border border-rule bg-surface px-4 py-3">
                <Text size="sm" tone="muted" as="span">
                  Réserves émises à la réception
                </Text>
                <Text size="sm" as="span">
                  <span className="whitespace-pre-line">{reserves}</span>
                </Text>

                {reservesLiftedAt !== null ? (
                  <Text size="sm" tone="soft">
                    Levées le {reservesLiftedAt.toLocaleDateString('fr-FR')}. La retenue de garantie
                    se libère à son terme.
                  </Text>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Text size="sm" tone="soft">
                      Tant qu’elles ne sont pas levées, vous conservez la retenue de garantie.
                      Déclarez la levée une fois les reprises faites.
                    </Text>
                    <LiftReservesForm quoteId={quoteId} min={asDay(receivedAt!)} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {completed && (
          <ReceptionForm
            quoteId={quoteId}
            current={receivedAt ? asDay(receivedAt) : ''}
            currentReserves={reserves}
          />
        )}
      </div>
    </Card>
  )
}
