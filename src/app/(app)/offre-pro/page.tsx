import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { denial } from '@/domain/authorization'
import { currentCompany, SessionError } from '@/lib/session'
import { hasPendingProRequest } from '@/services/plan'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { EmptyState } from '@/ui/molecules/empty-state'
import { Notice } from '@/ui/molecules/notice'
import { PageHeader } from '@/ui/molecules/page-header'
import { AppShell } from '@/ui/shells/app-shell'
import { RequestProButton } from './RequestProButton'

export const metadata = {
  title: 'Offre Pro',
}

/**
 * L'offre Pro, cote artisan.
 *
 * La page n'existait pas : le Pro ne se decrivait que dans l'ecran Équipe, et
 * ce dernier est masque de la navigation d'une entreprise gratuite — puisque
 * son entree exige `team.manage`, une capacite Pro. La seule surface qui vend
 * l'offre etait donc invisible pour ceux qui l'acheteraient. Cette page-la est
 * atteignable en gratuit, et c'est tout son objet.
 *
 * Elle ne liste que les DEUX capacites reellement Pro — l'equipe et la situation
 * ligne par ligne. Promettre « planning » ou « relances » comme la landing
 * serait vendre ce que le code ne reserve pas.
 */
function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Heading level={3} as="h2">
        {title}
      </Heading>
      <Text size="sm" tone="soft">
        {children}
      </Text>
    </div>
  )
}

const TEAM = (
  <Feature title="L’équipe">
    Invitez vos compagnons : ils tiennent l’agenda et publient au fil de chantier, sans jamais
    toucher à la facturation.
  </Feature>
)

const SITUATION = (
  <Feature title="Les situations de travaux, ligne par ligne">
    Facturez l’avancement ligne par ligne, à l’état d’avancement réel de chaque prestation. La
    situation au pourcentage global, elle, reste gratuite.
  </Feature>
)

const FREE_NOTE = (
  <Text size="sm" tone="muted">
    Tout ce que vous faites aujourd’hui — devis, factures, passeport, agenda, espace client — reste
    gratuit, et le restera.
  </Text>
)

export default async function OffreProPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const [current] = await db.select().from(company).where(eq(company.id, session.companyId))
  // `null` = déjà Pro · `plan` = responsable en gratuit · `role` = compagnon.
  const missing = denial(session, 'team.manage')

  if (missing === 'role') {
    return (
      <AppShell companyName={current.legalName} access={session}>
        <EmptyState
          title="Réservé au responsable"
          description="Seul le responsable de l’entreprise peut demander l’offre Pro."
          action={null}
        />
      </AppShell>
    )
  }

  if (missing === null) {
    return (
      <AppShell companyName={current.legalName} access={session}>
        <PageHeader title="Offre Pro" subtitle="Votre entreprise a l’offre Pro." />
        <Card elevation="e1">
          <div className="flex flex-col gap-5">
            {TEAM}
            {SITUATION}
            <div className="self-start">
              <ButtonLink href="/equipe" tone="secondary">
                Gérer votre équipe
              </ButtonLink>
            </div>
          </div>
        </Card>
        {FREE_NOTE}
      </AppShell>
    )
  }

  const pending = await hasPendingProRequest(session.companyId)

  return (
    <AppShell companyName={current.legalName} access={session}>
      <PageHeader title="Offre Pro" subtitle="Ce que Pro ajoute. Le reste ne bouge pas." />
      <Card elevation="e1">
        <div className="flex flex-col gap-5">
          {TEAM}
          {SITUATION}

          {pending ? (
            <Notice tone="verified">
              <Text as="span" size="sm">
                Votre demande est enregistrée. Nous activons votre offre Pro et vous préviendrons —
                rien à régler à cette étape.
              </Text>
            </Notice>
          ) : (
            <RequestProButton />
          )}
        </div>
      </Card>
      {FREE_NOTE}
    </AppShell>
  )
}
