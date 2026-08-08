import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { LegalMentionsForm } from './LegalMentionsForm'

export default async function LegalMentionsPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const [current] = await db.select().from(company).where(eq(company.id, session.companyId))

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Mentions de vos devis</h1>
        <p className="mt-2 text-sm opacity-70">
          Ces informations sont <strong>obligatoires sur tout devis</strong> adressé à un
          particulier. Sans elles, vos documents vous exposent à une amende — on ne peut donc pas
          les émettre. Vous ne les saisissez qu’une fois.
        </p>
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
    </main>
  )
}
