import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { activity } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { companyCoverage } from '@/services/visibility'
import { companyCertificates } from '@/services/certificates'
import { ActivityForm } from './ActivityForm'
import { CertificateForm } from './CertificateForm'
import { CertificateList } from './CertificateList'
import { CoverageList } from './CoverageList'

/**
 * L'etat de verification de l'entreprise.
 *
 * L'outil reste ouvert a tous ; c'est la vitrine publique qui exige une
 * assurance valide et adaptee a chaque activite affichee. Cet ecran montre
 * exactement ce qui manque pour y figurer.
 */
export default async function VerificationPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const [coverage, certificates, referential] = await Promise.all([
    companyCoverage(session.companyId, new Date()),
    companyCertificates(session.companyId),
    db.select().from(activity).orderBy(activity.code),
  ])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vérification</h1>
          <p className="mt-1 text-sm opacity-70">
            {coverage.isPublic
              ? 'Votre page publique est en ligne.'
              : 'Votre page publique s’affichera dès qu’une activité sera couverte.'}
          </p>
        </div>
        <Link href="/devis" className="text-sm underline opacity-70">
          Vos devis
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Vos activités</h2>
        <CoverageList activities={coverage.activities} />
        <ActivityForm options={referential} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Vos attestations</h2>
        <CertificateList certificates={certificates} />
        <CertificateForm />
        <p className="text-xs opacity-60">
          Une attestation est relue par une personne avant d’être prise en compte : c’est cette
          relecture qui rattache chaque libellé de votre contrat à une activité du référentiel.
        </p>
      </section>
    </main>
  )
}
