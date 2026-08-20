import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { denial } from '@/domain/authorization'
import { teamOf } from '@/services/team'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Text } from '@/ui/atoms/text'
import { EmptyState } from '@/ui/molecules/empty-state'
import { PageHeader } from '@/ui/molecules/page-header'
import { AppShell } from '@/ui/shells/app-shell'
import { TeamPanel } from './TeamPanel'

/**
 * L'equipe.
 *
 * **Le seul ecran du produit qui explique sa propre porte.** Ailleurs, un
 * membre est renvoye chez lui sans discours ; ici l'entreprise gratuite doit
 * comprendre ce qu'elle ne voit pas, sans quoi l'offre Pro n'existe pour
 * personne. Les deux refus sont distincts : le plan se resout en nous
 * appelant, le role ne se resout pas du tout.
 */
export default async function TeamPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/creer-mon-entreprise' : '/connexion')
    }
    throw e
  }

  const [current] = await db.select().from(company).where(eq(company.id, session.companyId))
  const missing = denial(session, 'team.manage')

  if (missing === 'role') {
    return (
      <AppShell companyName={current.legalName} access={session}>
        <EmptyState
          title="Réservé au responsable"
          description="Seul le responsable de l’entreprise gère les accès de l’équipe."
          action={null}
        />
      </AppShell>
    )
  }

  if (missing === 'plan') {
    return (
      <AppShell companyName={current.legalName} access={session}>
        <PageHeader title="Votre équipe" />

        {/*
          `action` mene desormais a la page de l'offre — la demande d'activation
          y vit en clair, tracee et in-app, la ou cet ecran ouvrait le client
          mail de l'artisan. Un vide sans porte de sortie reste ce qu'`EmptyState`
          interdit : la porte a seulement change de destination.
        */}
        <EmptyState
          title="L’équipe fait partie de l’offre Pro"
          description="Invitez vos compagnons : ils tiennent l’agenda et publient au fil de chantier, sans jamais toucher à la facturation."
          action={
            <ButtonLink href="/offre-pro" tone="conversion">
              Découvrir l’offre Pro
            </ButtonLink>
          }
        />

        <Text size="sm" tone="muted">
          Tout ce que vous faites aujourd’hui — devis, factures, passeport, agenda, espace
          client — reste gratuit, et le restera.
        </Text>
      </AppShell>
    )
  }

  const team = await teamOf(session.companyId)
  // Toujours trouve : la session VIENT d'une appartenance active a cette
  // entreprise, et `teamOf` lit exactement les memes lignes.
  const me = team.members.find((row) => row.userId === session.userId)

  return (
    <AppShell companyName={current.legalName} access={session}>
      <PageHeader
        title="Votre équipe"
        subtitle={
          <>
            Un <strong>compagnon</strong> tient l’agenda, publie au fil de chantier et consulte les
            devis. Il ne facture pas, n’encaisse pas et ne voit pas le passeport.
          </>
        }
      />

      <TeamPanel team={team} meMemberId={me!.id} />
    </AppShell>
  )
}
