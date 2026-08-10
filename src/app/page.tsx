import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { LandingShell } from '@/ui/shells/landing-shell'
import { currentCompany, SessionError } from '@/lib/session'
import { Home } from './_home/home'
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
 * La racine sert les deux publics.
 *
 * L'artisan membre d'une entreprise y voit son accueil ; tout autre visiteur y
 * voit la landing, inchangée. Le coût est réel — la racine passe en rendu
 * dynamique — et il est faible : la landing est faite de huit composants sans
 * aucun accès aux données, et rien de ce qui compte pour le référencement ne
 * change. Un artisan connecté ne doit jamais retomber sur l'argumentaire qui
 * lui a vendu le produit.
 *
 * `Steps` passe devant `Mentions` : on montre d'abord ce que l'outil fait, on
 * dit ensuite ce qu'il évite.
 */
export default async function RootPage() {
  // `currentCompany` lève `SessionError` pour les DEUX rejets — session
  // absente ou compte sans entreprise. Ici les deux mènent au même endroit :
  // la landing. Aucune redirection : un visiteur anonyme sur `/` est chez lui.
  // Seule `SessionError` est avalée : une panne réelle (base injoignable,
  // etc.) doit remonter comme partout ailleurs, pas se travestir en visite
  // anonyme.
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (!(e instanceof SessionError)) throw e
    session = null
  }

  if (session) {
    const [myCompany] = await db
      .select({ legalName: company.legalName })
      .from(company)
      .where(eq(company.id, session.companyId))

    return <Home session={session} companyName={myCompany.legalName} now={new Date()} />
  }

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
