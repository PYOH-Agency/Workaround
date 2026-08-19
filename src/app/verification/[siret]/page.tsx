import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidSiret } from '@/domain/siret'
import { verificationView } from '@/services/verification-view'
import { PublicShell } from '@/ui/shells/public-shell'
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
  return (
    <PublicShell variant="page">
      <Verdict view={await verificationView(siret, new Date())} />
    </PublicShell>
  )
}
