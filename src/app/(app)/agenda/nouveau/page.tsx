import { redirect } from 'next/navigation'
import { currentCompany, SessionError } from '@/lib/session'
import { PageHeader } from '@/ui/molecules/page-header'
import { AppShell } from '@/ui/shells/app-shell'
import { VisitForm } from './VisitForm'

/**
 * Le rendez-vous de visite.
 *
 * Le seul parcours du jalon qui ne part pas d'un chantier existant : la visite
 * precede le devis. Le formulaire cree donc les deux.
 */
export default async function NewVisitPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/creer-mon-entreprise' : '/connexion')
    }
    throw e
  }

  return (
    <AppShell access={session}>
      <PageHeader
        back={{ href: '/agenda', label: 'Retour à l’agenda' }}
        title="Prendre un rendez-vous"
        subtitle="Une visite chez un client, avant le devis."
      />

      <VisitForm />
    </AppShell>
  )
}
