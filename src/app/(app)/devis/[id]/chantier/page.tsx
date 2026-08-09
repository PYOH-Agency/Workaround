import { notFound, redirect } from 'next/navigation'
import { currentCompany, SessionError } from '@/lib/session'
import { companyChantierFile } from '@/services/chantier-file'
import { signedPhotoUrls } from '@/services/chantier-posts'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { AppShell } from '@/ui/shells/app-shell'
import { ChantierTimeline } from '@/ui/organisms/chantier-timeline'
import { PostForm } from './PostForm'

/**
 * Le suivi de chantier, cote artisan.
 *
 * **Il voit exactement ce que voit son client** — meme assemblage, meme
 * chronologie. C'est la moitie de l'interet de l'ecran : on publie mieux quand
 * on voit la page telle qu'elle est lue.
 */
export default async function ChantierFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) redirect('/connexion')
    throw e
  }

  const file = await companyChantierFile(session.companyId, id)
  if (!file) notFound()

  const photoUrls = await signedPhotoUrls(file.timeline.flatMap((e) => e.photoPaths ?? []))

  return (
    <AppShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Ce que voit votre client</Heading>
        <Text size="sm" tone="soft">
          Devis {file.number}
          {file.committedLeadTimeDays !== null &&
            ` · délai engagé : ${file.committedLeadTimeDays} jours ouvrés`}
        </Text>
      </div>

      <PostForm quoteId={file.quoteId} />

      <section className="flex flex-col gap-3">
        <Heading level={3} as="h2">
          Le fil
        </Heading>
        <ChantierTimeline entries={file.timeline} photoUrls={photoUrls} />
      </section>

      {file.receivedAt && (
        <Card elevation="flat">
          <Text size="sm" tone="soft">
            Votre client a déclaré la réception des travaux au{' '}
            <strong>{file.receivedAt.toLocaleDateString('fr-FR')}</strong>. C’est sa déclaration,
            pas un constat de notre part — mais elle vous est montrée parce qu’un fait partagé ne
            se consigne pas en secret.
          </Text>
        </Card>
      )}

      <div className="mt-2">
        <Link href={`/devis/${file.quoteId}`} tone="bare">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Icon name="back" />
            Retour au devis
          </span>
        </Link>
      </div>
    </AppShell>
  )
}
