import { notFound } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { Badge } from '@/ui/atoms/badge'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { EmptyState } from '@/ui/molecules/empty-state'
import { AdminShell } from '@/ui/shells/admin-shell'
import { setPlan } from './actions'

/**
 * Les entreprises inscrites, et leur abonnement.
 *
 * Un ecran de gestion, pas un tableau de bord : aucune courbe, aucun compteur.
 * La seule question a laquelle il repond est « cette entreprise a-t-elle
 * l'offre Pro ? », et le seul geste qu'il offre est d'y repondre.
 */
export default async function CompaniesPage() {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const companies = await db
    .select({
      id: company.id,
      legalName: company.legalName,
      siret: company.siret,
      plan: company.plan,
    })
    .from(company)
    .orderBy(desc(company.createdAt))
    .limit(200)

  return (
    <AdminShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Entreprises</Heading>
        <Text size="sm" tone="soft">
          L’abonnement se bascule ici, à la main. Aucun encaissement n’est automatisé.
        </Text>
      </div>

      {companies.length === 0 ? (
        /* `action` est requis par le composant : `null` quand il n'y a rien à proposer. */
        <EmptyState
          title="Aucune entreprise inscrite"
          description="La première inscription apparaîtra ici."
          action={null}
        />
      ) : (
        <div className="flex flex-col gap-3" data-testid="liste-entreprises">
          {companies.map((row) => (
            <Card key={row.id} elevation="e1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Text as="span">{row.legalName}</Text>
                  <Text size="sm" tone="muted" as="span">
                    SIRET {row.siret}
                  </Text>
                </div>

                <div className="flex items-center gap-3">
                  {/* `icon` est obligatoire : la couleur ne porte jamais seule
                      l'information. */}
                  <Badge
                    tone={row.plan === 'pro' ? 'verified' : 'neutral'}
                    icon={<Icon name={row.plan === 'pro' ? 'check' : 'clock'} size="sm" />}
                  >
                    {row.plan === 'pro' ? 'Pro' : 'Gratuit'}
                  </Badge>

                  <form action={setPlan.bind(null, row.id, row.plan === 'pro' ? 'free' : 'pro')}>
                    <Button type="submit" tone="secondary">
                      {row.plan === 'pro' ? 'Repasser au gratuit' : 'Passer en Pro'}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
