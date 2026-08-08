import type { Metadata } from 'next'
import { LandingShell } from '@/ui/shells/landing-shell'
import { Hero } from './_landing/pro/hero'
import { Mentions } from './_landing/pro/mentions'
import { Next } from './_landing/pro/next'
import { Passport } from './_landing/pro/passport'
import { Pricing } from './_landing/pro/pricing'
import { Principles } from './_landing/pro/principles'
import { Steps } from './_landing/pro/steps'

export const metadata: Metadata = {
  title: "D'équerre — devis, factures et assurance vérifiée pour le bâtiment",
  description:
    'Vos devis et vos factures, gratuits à vie, conformes aux mentions obligatoires du bâtiment. Et une page publique qui prouve que votre assurance est à jour.',
  alternates: { canonical: '/' },
}

export default function Home() {
  return (
    <LandingShell audience="pro">
      <Hero />
      <Mentions />
      <Steps />
      <Passport />
      <Principles />
      <Next />
      <Pricing />
    </LandingShell>
  )
}
