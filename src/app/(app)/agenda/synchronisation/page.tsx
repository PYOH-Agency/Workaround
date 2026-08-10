import { redirect } from 'next/navigation'
import { can } from '@/domain/authorization'
import { currentCompany, SessionError } from '@/lib/session'
import { agendaFeedToken } from '@/services/agenda-feed'
import { linkedCalendars } from '@/services/calendar-links'
import { PROVIDERS } from '@/services/calendar-registry'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { Notice } from '@/ui/molecules/notice'
import { PageHeader } from '@/ui/molecules/page-header'
import { AppShell } from '@/ui/shells/app-shell'
import { CopyField } from './CopyField'
import { LinkButton, RegenerateButton, UnlinkButton } from './SyncButtons'

const MESSAGES: Record<string, string> = {
  fournisseur_inconnu: 'Ce fournisseur n’est pas reconnu.',
  autorisation_invalide: 'L’autorisation n’a pas abouti. Réessayez depuis cette page.',
  raccordement_impossible: 'Le raccordement a échoué. Réessayez dans un instant.',
}

/**
 * Les raccordements d'agenda.
 *
 * Trois blocs, et le troisieme est celui qu'on est tente d'omettre : Apple est
 * **explique**, pas grise. Un bouton inactif sans explication passerait pour
 * une fonctionnalite en retard ; c'est une decision.
 */
export default async function SyncPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>
}) {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  // Reserve au responsable : le compagnon ne touche pas a l'argent. La
  // navigation ne le lui propose pas ; celui qui tape l'adresse est renvoye
  // chez lui, sans discours.
  if (!can(session, 'agenda.sync')) redirect('/devis')

  const { erreur } = await searchParams
  const [token, linked] = await Promise.all([
    agendaFeedToken(session.companyId),
    linkedCalendars(session.companyId),
  ])

  const feedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/abonnement/${token}/dequerre.ics`

  return (
    <AppShell access={session}>
      <PageHeader
        back={{ href: '/agenda', label: 'Retour à l’agenda' }}
        title="Synchronisation"
        subtitle="Vos rendez-vous dans l’agenda que vous consultez déjà."
      />

      {erreur && (
        <Notice tone="danger" alert>
          {MESSAGES[erreur] ?? 'Quelque chose n’a pas fonctionné.'}
        </Notice>
      )}

      <Card elevation="e1">
        <div className="flex flex-col gap-3">
          <Heading level={3} as="h2">
            Votre adresse d’abonnement
          </Heading>
          <Text size="sm" tone="soft">
            Collez-la dans Google Agenda, Apple Calendrier ou Outlook. Vos rendez-vous y
            apparaîtront, et se mettront à jour tout seuls.
          </Text>

          <CopyField value={feedUrl} label="Copier l’adresse" />

          {/*
            Le jeton EST l'autorisation : il n'y a pas de session derriere une
            adresse collee dans Google. L'artisan doit savoir ce qu'il deplace.

            En `Notice` laiton et non en texte efface : c'est une mise en garde,
            et le ton `muted` la rendait moins visible que la phrase d'aide qui
            la precede. Sans `alert` — elle est permanente, pas survenue.
          */}
          <Notice tone="warning">
            Cette adresse donne accès à vos rendez-vous : nom du client, adresse et téléphone. La
            coller dans Google ou Apple, c’est leur confier ces informations.{' '}
            <strong>Toute personne qui l’obtient voit votre agenda</strong> — régénérez-la si vous
            l’avez partagée par erreur.
          </Notice>

          <div className="self-start">
            <RegenerateButton />
          </div>
        </div>
      </Card>

      <Card elevation="e1">
        <div className="flex flex-col gap-4">
          <Heading level={3} as="h2">
            Vos disponibilités
          </Heading>
          <Text size="sm" tone="soft">
            Nous lisons uniquement vos <strong>créneaux occupés</strong> — jamais le titre de vos
            rendez-vous, ni avec qui. C’est la permission que nous demandons, pas une promesse
            que nous nous faisons.
          </Text>

          {PROVIDERS.map((provider) => {
            const active = linked.find((item) => item.provider === provider.id)

            return (
              <div key={provider.id} className="flex flex-wrap items-center gap-3">
                <Text size="sm" as="span">
                  <strong>{provider.label}</strong>
                  {active && ` · ${active.accountEmail}`}
                </Text>
                <div className="ml-auto">
                  {active ? (
                    <UnlinkButton provider={provider.id} />
                  ) : (
                    <LinkButton provider={provider.id} label={provider.label} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card elevation="flat">
        <div className="flex flex-col gap-2" data-testid="apple">
          <Heading level={3} as="h2">
            Et Apple ?
          </Heading>
          <Text size="sm" tone="soft">
            Apple ne permet pas de connecter un agenda de cette façon : il faudrait conserver un
            mot de passe qui ouvre l’ensemble de vos services iCloud, et{' '}
            <strong>nous ne le ferons pas</strong>.
          </Text>
          <Text size="sm" tone="soft">
            <strong>L’abonnement ci-dessus fonctionne</strong>, lui, dans l’application Calendrier
            d’Apple : vos rendez-vous D’équerre y apparaissent. Seul le sens inverse — lire vos
            disponibilités — nous est fermé.
          </Text>
        </div>
      </Card>

    </AppShell>
  )
}
