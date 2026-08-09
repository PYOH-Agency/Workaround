import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { companySlug } from '@/domain/slug'
import { currentCompany, SessionError } from '@/lib/session'
import { companyMetrics } from '@/services/passport-metrics'
import { companyQuoteLeadTime } from '@/services/quote-lead-time'
import { disputesInReview } from '@/services/disputes'
import { companyCoverage } from '@/services/visibility'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
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
  const [metrics, disputes, quoteLeadTime, coverage, [profile]] = await Promise.all([
    companyMetrics(session.companyId, now),
    disputesInReview(session.companyId, now),
    companyQuoteLeadTime(session.companyId, now),
    companyCoverage(session.companyId, now),
    db
      .select({ legalName: company.legalName, siret: company.siret })
      .from(company)
      .where(eq(company.id, session.companyId))
      .limit(1),
  ])

  // `/artisan/` et non `passportUrl()`, qui rend l'adresse `/p/` : ce detour
  // existe pour **compter** une consultation. L'artisan qui relit sa propre
  // fiche gonflerait la metrique qu'il est justement venu verifier.
  //
  // `profile` est garanti par la cle etrangere que `member` porte vers
  // `company`, mais tous les `.limit(1)` du depot gardent ce cas — et ici le
  // repli est gratuit : sans ligne, pas de lien, et l'artisan lit a la place
  // ce qui lui manque pour etre visible.
  const publicUrl =
    coverage.isPublic && profile
      ? `/artisan/${companySlug(profile.legalName, profile.siret)}`
      : null

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
        <Card elevation="flat">
          <div className="flex flex-col gap-2" data-testid="fiche-publique">
            {publicUrl ? (
              <>
                <Text size="sm" tone="soft">
                  Votre fiche est visible dans l’annuaire. Voici ce qu’un client y voit.
                </Text>
                <Link href={publicUrl} newTab testId="voir-fiche-publique">
                  Voir ma fiche publique
                </Link>
              </>
            ) : (
              <>
                <Text size="sm" tone="soft">
                  Aucune de vos activités n’est couverte : vous n’apparaissez pas encore dans
                  l’annuaire.
                </Text>
                <Link href="/verification" testId="completer-verification">
                  Voir ce qu’il manque
                </Link>
              </>
            )}
          </div>
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
