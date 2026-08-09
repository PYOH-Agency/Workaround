import type { Deadline, GuaranteeKey } from '@/domain/guarantees'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { ReceptionForm } from './ReceptionForm'

const NAMES: Record<GuaranteeKey, string> = {
  perfect_completion: 'Parfait achèvement',
  proper_function: 'Bon fonctionnement',
  decennial: 'Garantie décennale',
}

/**
 * Deux etats, et ils ne disent pas la meme chose.
 *
 * **Sans reception declaree, aucune date.** La reception tacite exige deux
 * criteres cumulatifs — prise de possession sans reserve et paiement integral —
 * et nous n'en connaissons qu'un. Afficher une date que nous n'avons pas
 * constatee ferait manquer un delai de forclusion a celui qu'elle protege.
 */
export function Guarantees({
  quoteId,
  deadlines,
  receivedAt,
  completed,
}: {
  quoteId: string
  deadlines: Deadline[] | null
  receivedAt: Date | null
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
            Elles courent à partir de la <strong>réception des travaux</strong>, qui est un acte de
            votre part : vous prenez possession de l’ouvrage sans réserve et vous avez réglé
            l’intégralité du prix. <strong>Nous ne pouvons pas la constater à votre place.</strong>{' '}
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
          </>
        )}

        {completed && (
          <ReceptionForm
            quoteId={quoteId}
            current={receivedAt ? receivedAt.toISOString().slice(0, 10) : ''}
          />
        )}
      </div>
    </Card>
  )
}
