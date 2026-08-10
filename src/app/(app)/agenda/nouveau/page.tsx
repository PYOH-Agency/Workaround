import { redirect } from 'next/navigation'
import { currentCompany, SessionError } from '@/lib/session'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
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
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  return (
    <AppShell access={session}>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Prendre un rendez-vous</Heading>
        <Text size="sm" tone="soft">
          Une visite chez un client, avant le devis.
        </Text>
      </div>

      <VisitForm />

      <div className="mt-2">
        <Link href="/agenda" tone="bare">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Icon name="back" />
            Retour à l’agenda
          </span>
        </Link>
      </div>
    </AppShell>
  )
}
