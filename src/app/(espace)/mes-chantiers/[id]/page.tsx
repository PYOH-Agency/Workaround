import { notFound, redirect } from 'next/navigation'
import { currentRequester, SessionError } from '@/lib/session'
import { chantierFileFor } from '@/services/chantier-file'
import { signedPhotoUrls } from '@/services/chantier-posts'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { PageHeader } from '@/ui/molecules/page-header'
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
    <SpaceShell
      /*
        Les documents se dockent, le reste non.

        Le demandeur ouvre son chantier pour deux raisons : voir ou ca en est,
        et retrouver une piece. Empiler la seconde sous la premiere l'obligeait
        a traverser tout le fil pour atteindre son devis signe.

        Les garanties restent dans la colonne : elles portent un texte juridique
        et un formulaire de reception, et 16 rem ne sont pas une largeur de
        lecture.
      */
      aside={
        <section className="flex flex-col gap-3 rounded-card border border-rule bg-card p-5">
          <Heading level={3} as="h2">
            Vos documents
          </Heading>
          <ul className="flex flex-col gap-2" data-testid="documents">
            {file.documents.map((document) => (
              <li key={document.href}>
                <Link href={document.href}>{document.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      }
    >
      <PageHeader
        back={{ href: '/mes-logements', label: 'Retour à mes logements' }}
        title={`Devis ${file.number}`}
        subtitle={
          <>
            {file.companyName}
            {file.committedLeadTimeDays !== null &&
              ` · délai engagé : ${file.committedLeadTimeDays} jours ouvrés`}
          </>
        }
      />

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
        reserves={file.reserves}
        reservesLiftedAt={file.reservesLiftedAt}
        completed={file.completedAt !== null}
      />
    </SpaceShell>
  )
}
