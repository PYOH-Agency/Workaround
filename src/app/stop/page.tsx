import type { Metadata } from 'next'
import { recordOptout } from '@/services/attestation-request'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { PublicShell } from '@/ui/shells/public-shell'

/**
 * La page ouverte par le lien « je ne souhaite plus etre contacte ».
 *
 * Jamais indexee : elle ne contient rien qui merite d'apparaitre dans une
 * recherche, et son URL porte une adresse mail en clair.
 */
export const metadata: Metadata = {
  title: 'Opposition — D’équerre',
  robots: { index: false, follow: false },
}

export default async function StopPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; s?: string }>
}) {
  const { e, s } = await searchParams

  const ok = await recordOptout(e, s, process.env.MAIL_OPTOUT_SECRET ?? '')

  return (
    <PublicShell variant="plain">
      <div className="flex flex-col gap-2">
        <Heading level={2} as="h1">
          {ok ? 'Vous ne recevrez plus de message' : 'Ce lien ne fonctionne pas'}
        </Heading>
        <Text tone="soft">
          {ok
            ? 'Nous ne vous écrirons plus à cette adresse, quelle que soit la personne qui nous en fait la demande.'
            : 'Le lien semble incomplet, peut-être tronqué par votre messagerie. Écrivez-nous directement pour que nous retirions votre adresse.'}
        </Text>
      </div>
    </PublicShell>
  )
}
