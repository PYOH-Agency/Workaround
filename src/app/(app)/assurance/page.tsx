import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { InsuranceForm } from './InsuranceForm'

export default async function InsurancePage() {
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
        <h1 className="text-2xl font-semibold">Votre assurance professionnelle</h1>
        <p className="mt-2 text-sm opacity-70">
          Ces mentions sont <strong>obligatoires sur tout devis et toute facture</strong> du
          bâtiment (article L243-2 du Code des assurances). Sans elles, vos documents vous exposent
          à une amende — on ne peut donc pas les émettre.
        </p>
        <p className="mt-2 text-sm opacity-70">
          Elles figurent sur votre attestation d’assurance décennale.
        </p>
      </div>

      <InsuranceForm
        defaults={{
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
