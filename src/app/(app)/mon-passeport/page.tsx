import { redirect } from 'next/navigation'
import { currentCompany, SessionError } from '@/lib/session'
import { companyMetrics } from '@/services/passport-metrics'
import { companyQuoteLeadTime } from '@/services/quote-lead-time'
import { disputesInReview } from '@/services/disputes'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { AppShell } from '@/ui/shells/app-shell'
import { MetricCard } from './MetricCard'
import { MedianCard } from './MedianCard'
import { DisputeList } from './DisputeList'

/**
 * Le passeport, vu par l'artisan.
 *
 * **Il n'est pas encore public.** L'article 35.9 du RGPD exige l'avis des
 * personnes concernees avant la mise en oeuvre, et aucun artisan n'etait
 * inscrit quand l'analyse d'impact a ete menee. L'artisan voit donc ses
 * chiffres avant tout le monde — ce qui est aussi ce que l'AIPD demande :
 * notification individuelle et delai de contestation avant publication.
 */
export default async function PassportPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const now = new Date()
  const metrics = await companyMetrics(session.companyId, now)
  const disputes = await disputesInReview(session.companyId, now)
  const quoteLeadTime = await companyQuoteLeadTime(session.companyId, now)

  return (
    <AppShell>
      <div className="flex flex-col gap-2">
        <Heading level={1}>Votre passeport</Heading>
        <Card elevation="flat">
          <Text size="sm" tone="soft">
            <strong>Il n’est pas encore public.</strong> Vous le voyez avant tout le monde, pour
            pouvoir le vérifier — et nous dire s’il vous semble faux.
          </Text>
        </Card>
      </div>

      <DisputeList disputes={disputes} />

      <div className="flex flex-col gap-3">
        <MetricCard
          testId="taux-ecart"
          label="Facturé au prix annoncé"
          rate={metrics.quoteToInvoiceGap}
          definition="Part de vos chantiers dont le total facturé n’a pas dépassé le devis initial."
        />

        <MetricCard
          testId="taux-delai"
          label="Délai annoncé respecté"
          rate={metrics.leadTimeRespect}
          definition="Part de vos chantiers terminés dans le délai que vous aviez engagé, en jours ouvrés."
        />

        <MedianCard
          testId="delai-remise"
          label="Délai de remise du devis"
          median={quoteLeadTime}
          definition="Le temps que vous mettez à envoyer un devis après une visite, en jours calendaires."
        />

        <Card elevation="e1">
          <div className="flex flex-col gap-1" data-testid="volume-chantiers">
            {/* Meme partage qu'en `MetricCard` : le nom titre, le chiffre est la valeur. */}
            <Text size="label" tone="muted" as="h2">
              Chantiers terminés
            </Text>
            <Heading level={2} as="p">
              {metrics.completed.window}
            </Heading>
            <Text size="sm" tone="soft">
              sur douze mois · {metrics.completed.total} depuis le début
            </Text>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
