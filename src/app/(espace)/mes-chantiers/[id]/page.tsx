import { notFound, redirect } from 'next/navigation'
import { currentRequester, SessionError } from '@/lib/session'
import { chantierFileFor } from '@/services/chantier-file'
import { signedPhotoUrls } from '@/services/chantier-posts'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { SpaceShell } from '@/ui/shells/space-shell'
import { ChantierTimeline } from '@/ui/organisms/chantier-timeline'
import { Guarantees } from './Guarantees'

/**
 * Le dossier d'un chantier, vu par son client.
 *
 * Sa chronologie est **derivee** : elle existe meme si l'entreprise n'a jamais
 * rien publie. Ce qu'elle publie s'y intercale.
 */
export default async function ChantierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  try {
    session = await currentRequester()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucun dossier') ? '/' : '/connexion')
    }
    throw e
  }

  const file = await chantierFileFor(session.requesterId, id)
  if (!file) notFound()

  const photoUrls = await signedPhotoUrls(file.timeline.flatMap((e) => e.photoPaths ?? []))

  return (
    <SpaceShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Devis {file.number}</Heading>
        <Text size="sm" tone="soft">
          {file.companyName}
          {file.committedLeadTimeDays !== null &&
            ` · délai engagé : ${file.committedLeadTimeDays} jours ouvrés`}
        </Text>
      </div>

      <section className="flex flex-col gap-3">
        <Heading level={3} as="h2">
          Suivi
        </Heading>
        <ChantierTimeline entries={file.timeline} photoUrls={photoUrls} />
      </section>

      <Guarantees
        quoteId={file.quoteId}
        deadlines={file.deadlines}
        receivedAt={file.receivedAt}
        completed={file.completedAt !== null}
      />

      <section className="flex flex-col gap-3">
        <Heading level={3} as="h2">
          Vos documents
        </Heading>
        <Card elevation="e1">
          <ul className="flex flex-col gap-2" data-testid="documents">
            {file.documents.map((document) => (
              <li key={document.href}>
                <Link href={document.href}>{document.label}</Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <div className="mt-2">
        <Link href="/mes-logements" tone="bare">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Icon name="back" />
            Retour à mes logements
          </span>
        </Link>
      </div>
    </SpaceShell>
  )
}
