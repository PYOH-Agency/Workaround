import { notFound, redirect } from 'next/navigation'
import { currentCompany, SessionError } from '@/lib/session'
import { companyChantierFile } from '@/services/chantier-file'
import { signedPhotoUrls } from '@/services/chantier-posts'
import { Heading } from '@/ui/atoms/heading'
import { Notice } from '@/ui/molecules/notice'
import { PageHeader } from '@/ui/molecules/page-header'
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
    <AppShell access={session}>
      <PageHeader
        back={{ href: `/devis/${file.quoteId}`, label: `Retour au devis ${file.number}` }}
        title="Ce que voit votre client"
        subtitle={
          file.committedLeadTimeDays !== null
            ? `Délai engagé : ${file.committedLeadTimeDays} jours ouvrés`
            : undefined
        }
      />

      {/*
        La reception declaree remonte avant le fil : c'est un fait qui change ce
        qu'on publie ensuite — on ne poste pas la meme chose sur un chantier que
        le client considere comme receptionne.
      */}
      {file.receivedAt && (
        <Notice tone="verified">
          Votre client a déclaré la réception des travaux au{' '}
          <strong>{file.receivedAt.toLocaleDateString('fr-FR')}</strong>. C’est sa déclaration, pas
          un constat de notre part — mais elle vous est montrée parce qu’un fait partagé ne se
          consigne pas en secret.
        </Notice>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading level={3} as="h2">
            Le fil
          </Heading>
        </div>
        <ChantierTimeline entries={file.timeline} photoUrls={photoUrls} />
      </section>

      {/*
        Le formulaire passe SOUS le fil. Il occupait le haut de l'ecran alors
        que le titre promet « ce que voit votre client » : on vient d'abord
        relire la page telle qu'elle est lue, on publie ensuite.
      */}
      <PostForm quoteId={file.quoteId} />
    </AppShell>
  )
}
