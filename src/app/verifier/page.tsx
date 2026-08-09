import type { Metadata } from 'next'
import { LandingShell } from '@/ui/shells/landing-shell'
import { Hero } from '../_landing/verifier/hero'
import { Notebook } from '../_landing/verifier/notebook'
import { Retrieve } from '../_landing/verifier/retrieve'
import { Trap } from '../_landing/verifier/trap'

export const metadata: Metadata = {
  title: "Vérifier l'assurance d'un artisan — D'équerre",
  description:
    'Une assurance décennale ne couvre que les activités qu’elle nomme. Entrez le SIRET de l’entreprise : nous affichons ce qui est couvert, et ce qui ne l’est pas.',
  alternates: { canonical: '/verifier' },
}

export default function Verifier() {
  return (
    <LandingShell audience="demandeur">
      <Hero />
      <Trap />
      <Retrieve />
      <Notebook />
    </LandingShell>
  )
}
