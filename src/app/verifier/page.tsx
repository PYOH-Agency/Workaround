import type { Metadata } from 'next'
import { LandingShell } from '@/ui/shells/landing-shell'
import { After } from '../_landing/verifier/after'
import { Directory } from '../_landing/verifier/directory'
import { Hero } from '../_landing/verifier/hero'
import { Notebook } from '../_landing/verifier/notebook'
import { Retrieve } from '../_landing/verifier/retrieve'
import { Trap } from '../_landing/verifier/trap'

export const metadata: Metadata = {
  title: "Vérifier l'assurance d'un artisan — D'équerre",
  description:
    'Entrez le SIRET de l’entreprise : nous affichons les activités que son assurance couvre, et celles qu’elle ne couvre pas. Puis chaque chantier signé se range dans le carnet de votre logement — suivi, factures et dates de garantie.',
  alternates: { canonical: '/verifier' },
}

/**
 * L'ordre dit quelque chose, et il a change.
 *
 * La page enchainait la question, le piege, un formulaire de service et une
 * promesse a venir : trois de ses quatre sections mettaient en garde, aucune ne
 * disait ce qu'on y gagne. D'ou une page juste et froide.
 *
 * Elle alterne desormais l'avertissement et la contrepartie, et les deux bandes
 * d'encre l'encadrent : le piege pose le probleme, le carnet donne la
 * contrepartie et ferme la page. Entre les deux, ce qu'on obtient et ou trouver
 * une entreprise, sur la craie. `Retrieve` reste en fin de page : c'est un
 * service rendu a qui a perdu son lien, pas un argument.
 */
export default function Verifier() {
  return (
    <LandingShell audience="demandeur">
      <Hero />
      <Trap />
      <After />
      <Directory />
      <Notebook />
      <Retrieve />
    </LandingShell>
  )
}
