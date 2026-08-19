import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidSiret } from '@/domain/siret'
import { verificationView } from '@/services/verification-view'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { PublicShell } from '@/ui/shells/public-shell'
import { CopyMessage } from './CopyMessage'
import { RequestForm } from './RequestForm'
import { Verdict } from './Verdict'

/**
 * **Jamais indexee.** Publier une fiche non sollicitee sur un tiers, c'est le
 * modele societe.com : une AIPD a rouvrir, et une contradiction frontale avec un
 * produit dont l'argument est la confiance. L'URL porte le SIRET et non un slug
 * nominatif, pour la meme raison.
 *
 * Le titre ne nomme pas l'entreprise : il partirait dans l'onglet du navigateur,
 * dans l'historique et dans tout apercu de lien, alors que la page n'affirme
 * rien a son sujet. Il est donc constant, et ne depend pas de `params` — d'ou un
 * `metadata` statique plutot qu'un `generateMetadata`.
 *
 * `src/app/robots.ts` redit la meme chose pour les robots qui ne lisent que lui.
 */
export const metadata: Metadata = {
  title: 'Vérification — D’équerre',
  robots: { index: false, follow: false },
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ siret: string }>
}) {
  const { siret } = await params

  // Garde-fou avant tout appel reseau : inutile d'interroger le repertoire pour
  // un numero dont la cle de Luhn est fausse.
  if (!isValidSiret(siret)) notFound()

  // `page` et non `document` : ce n'est pas un document emis par une entreprise,
  // et la mention « Document emis avec D'equerre » du pied de page se lirait
  // comme une caution.
  // Le lien de la page, construit depuis la base de l'application comme partout
  // ailleurs dans ce parcours : ecrit en dur, la recette pointerait la production.
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/verification/${siret}`

  return (
    <PublicShell variant="page">
      <div className="flex flex-col gap-6">
        <Verdict view={await verificationView(siret, new Date())} />

        {/*
          Les deux chemins viennent APRES le constat, jamais avant : la page
          dit d'abord ce qu'elle ne peut pas affirmer, et seulement ensuite ce
          qu'il reste a faire. Le premier bloc est l'action principale — c'est
          le seul endroit du produit ou une entreprise nous devient joignable.
        */}
        <Card>
          <div className="flex flex-col gap-4">
            <Heading level={3} as="h2">
              Demandez-lui son attestation
            </Heading>
            <Text tone="soft">
              Nous écrivons à l’entreprise en votre nom. Si elle nous transmet son attestation, nous
              la vérifions, activité par activité.
            </Text>
            <RequestForm siret={siret} />
          </div>
        </Card>

        <Card elevation="flat">
          <div className="flex flex-col gap-4">
            <Heading level={3} as="h2">
              Ou demandez-lui vous-même
            </Heading>
            <Text tone="soft">
              Un message prêt à coller, avec le lien de cette page, pour un SMS ou une messagerie.
              Nous n’envoyons rien et n’enregistrons aucun contact.
            </Text>
            <CopyMessage siret={siret} pageUrl={pageUrl} />
          </div>
        </Card>
      </div>
    </PublicShell>
  )
}
