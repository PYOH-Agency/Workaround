import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, need } from '@/db/schema'
import { searchDirectory } from '@/services/directory'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { EmptyState } from '@/ui/molecules/empty-state'
import { PublicShell } from '@/ui/shells/public-shell'
import { ResultList } from './ResultList'
import { SearchForm } from './SearchForm'

export const metadata: Metadata = {
  title: 'Trouver un artisan vérifié',
  description:
    'Chaque entreprise affichée est assurée pour l’activité que vous cherchez, et sa couverture est vérifiée.',
}

/**
 * L'annuaire.
 *
 * La recherche se fait en `GET` : l'URL porte la requete, donc elle se partage
 * et s'indexe. C'est ce qui fait que le passeport de M3 commence a rapporter.
 */
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ besoin?: string; zone?: string }>
}) {
  const { besoin, zone } = await searchParams

  const needs = await db
    .select({ slug: need.slug, label: need.label, activityCode: need.activityCode })
    .from(need)
    .orderBy(need.label)

  const chosen = needs.find((n) => n.slug === besoin)

  const [matchedActivity] = chosen
    ? await db.select().from(activity).where(eq(activity.code, chosen.activityCode))
    : []

  const results =
    chosen && zone ? await searchDirectory({ activityCode: chosen.activityCode, zone }, new Date()) : []

  return (
    <PublicShell variant="page">
      <div className="flex flex-col gap-2">
        <Heading level={1}>Trouver un artisan</Heading>
        <Text tone="soft">
          Chaque entreprise affichée ici est assurée pour l’activité que vous cherchez — et sa
          couverture a été vérifiée, pas déclarée.
        </Text>
      </div>

      <SearchForm needs={needs} besoin={besoin} zone={zone} />

      {chosen && zone ? (
        results.length > 0 ? (
          <ResultList results={results} activityLabel={matchedActivity?.label ?? chosen.label} />
        ) : (
          /*
            Un annuaire vide au demarrage est la situation normale, pas une
            erreur. Elargir la zone en douce pour remplir la page reviendrait a
            envoyer un demandeur bordelais vers un artisan lillois.
          */
          <EmptyState
            title="Aucune entreprise vérifiée pour ce travail dans cette zone"
            description="L’annuaire est jeune. Essayez une commune voisine, ou un code postal plutôt qu’un nom de ville."
            action={
              <Text size="sm" tone="muted">
                Nous n’élargissons pas la recherche à votre place : un artisan trop loin ne vous
                sert à rien.
              </Text>
            }
          />
        )
      ) : null}
    </PublicShell>
  )
}
