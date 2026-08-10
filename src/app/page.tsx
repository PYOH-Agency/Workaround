import type { Metadata } from 'next'
import { LandingShell } from '@/ui/shells/landing-shell'
import { Hero } from './_landing/pro/hero'
import { Mentions } from './_landing/pro/mentions'
import { Next } from './_landing/pro/next'
import { Passport } from './_landing/pro/passport'
import { Pricing } from './_landing/pro/pricing'
import { Principles } from './_landing/pro/principles'
import { Sequence } from './_landing/pro/sequence'
import { Steps } from './_landing/pro/steps'

export const metadata: Metadata = {
  title: "D'équerre — devis, factures et assurance vérifiée pour le bâtiment",
  description:
    'Vos devis et vos factures, gratuits à vie, conformes aux mentions obligatoires du bâtiment. Et une page publique qui prouve que votre assurance est à jour.',
  alternates: { canonical: '/' },
}

/**
 * `Steps` passe devant `Mentions`, et c'est un changement d'accueil.
 *
 * La page enchainait l'accroche et une amende de 15 000 €. L'argument est juste
 * — c'est la douleur reelle du metier —, mais le placer en deuxieme section
 * faisait ouvrir la conversation sur une menace, a un artisan qui ne nous
 * connait pas encore. On montre d'abord ce que l'outil fait, on dit ensuite ce
 * qu'il evite. Aucun contenu n'est retire : seul l'ordre change.
 */
export default function Home() {
  return (
    <LandingShell audience="pro">
      <Hero />
      <Steps />
      <Mentions />
      <Sequence />
      <Passport />
      <Principles />
      <Next />
      <Pricing />
    </LandingShell>
  )
}
