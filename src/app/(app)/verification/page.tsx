import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { activity } from '@/db/schema'
import { can } from '@/domain/authorization'
import { currentCompany, SessionError } from '@/lib/session'
import { companyCertificates } from '@/services/certificates'
import { companyCoverage } from '@/services/visibility'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { AppShell } from '@/ui/shells/app-shell'
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

  // Reserve au responsable : le compagnon ne touche pas a l'argent. La
  // navigation ne le lui propose pas ; celui qui tape l'adresse est renvoye
  // chez lui, sans discours.
  if (!can(session, 'legal.write')) redirect('/devis')

  const [coverage, certificates, referential] = await Promise.all([
    companyCoverage(session.companyId, new Date()),
    companyCertificates(session.companyId),
    db.select().from(activity).orderBy(activity.code),
  ])

  return (
    <AppShell access={session}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>Vérification</Heading>
          <Text size="sm" tone="soft">
            {coverage.isPublic
              ? 'Votre page publique est en ligne.'
              : 'Votre page publique s’affichera dès qu’une activité sera couverte.'}
          </Text>
        </div>
        <Link href="/devis" tone="bare">
          <span className="text-sm">Vos devis</span>
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <Heading level={3} as="h2">
          Vos activités
        </Heading>
        <CoverageList activities={coverage.activities} />
        <ActivityForm options={referential} />
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={3} as="h2">
          Vos attestations
        </Heading>
        <CertificateList certificates={certificates} />
        <CertificateForm />
        <Text size="sm" tone="muted">
          Une attestation est relue par une personne avant d’être prise en compte : c’est cette
          relecture qui rattache chaque libellé de votre contrat à une activité du référentiel.
        </Text>
      </section>
    </AppShell>
  )
}
