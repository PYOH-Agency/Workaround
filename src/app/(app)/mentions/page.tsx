import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { can } from '@/domain/authorization'
import { currentCompany, SessionError } from '@/lib/session'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { AppShell } from '@/ui/shells/app-shell'
import { LegalMentionsForm } from './LegalMentionsForm'

export default async function LegalMentionsPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/creer-mon-entreprise' : '/connexion')
    }
    throw e
  }

  // Reserve au responsable : le compagnon ne touche pas a l'argent. La
  // navigation ne le lui propose pas ; celui qui tape l'adresse est renvoye
  // chez lui, sans discours.
  if (!can(session, 'legal.write')) redirect('/devis')

  const [current] = await db.select().from(company).where(eq(company.id, session.companyId))

  return (
    <AppShell access={session} companyName={current.legalName}>
      {/* Un formulaire long reste lisible en colonne etroite, meme sous un gabarit large. */}
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Heading level={1}>Mentions de vos devis</Heading>
          <Text size="sm" tone="soft">
            Ces informations sont <strong>obligatoires sur tout devis</strong> adressé à un
            particulier. Sans elles, vos documents vous exposent à une amende — on ne peut donc
            pas les émettre. Vous ne les saisissez qu’une fois.
          </Text>
        </div>

        <LegalMentionsForm
        defaults={{
          legalFormLabel: current.legalFormLabel ?? '',
          registrationNumber: current.registrationNumber ?? '',
          phone: current.phone ?? '',
          email: current.email ?? session.email,
          vatNumber: current.vatNumber ?? '',
          vatExempt: current.vatExempt,
          quoteValidityDays: current.quoteValidityDays ?? 90,
          paymentTerms:
            current.paymentTerms ?? 'Acompte de 30 % à la commande, solde à la réception des travaux.',
          insurerName: current.insurerName ?? '',
          insurerAddress: current.insurerAddress ?? '',
          policyNumber: current.policyNumber ?? '',
          coveredActivities: current.coveredActivities ?? '',
            coverageArea: current.coverageArea ?? 'France métropolitaine',
          }}
        />
      </div>
    </AppShell>
  )
}
