import { notFound, redirect } from 'next/navigation'
import { currentRequester, SessionError } from '@/lib/session'
import { bookedCompany } from '@/services/address-book'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { PageHeader } from '@/ui/molecules/page-header'
import { SpaceShell } from '@/ui/shells/space-shell'
import { ContactForm } from './ContactForm'

/**
 * La fiche d'une entreprise du repertoire.
 *
 * Le telephone y figure : c'est une mention obligatoire de ses devis depuis M1,
 * donc rien que le demandeur n'ait deja. L'afficher ici lui evite de retrouver
 * le document.
 */
export default async function BookedCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  let session
  try {
    session = await currentRequester()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucun dossier') ? '/' : '/connexion')
    }
    throw e
  }

  const sheet = await bookedCompany(session.requesterId, companyId, new Date())
  if (!sheet || sheet.kind !== 'company') notFound()

  const { covered = [], lapsed = [], passportPath = null } = sheet.coverage ?? {}

  return (
    <SpaceShell>
      <PageHeader
        back={{ href: '/mon-repertoire', label: 'Retour au répertoire' }}
        title={sheet.name}
        subtitle={`Dernière intervention : ${sheet.lastChantier.label}, ${sheet.lastChantier.at.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
      />

      <Card elevation="e1">
        <div className="flex flex-col gap-2" data-testid="verification">
          {covered.length > 0 ? (
            <Text size="sm" tone="soft">
              Assurée aujourd’hui pour : {covered.join(', ')}.
            </Text>
          ) : lapsed.length > 0 ? (
            <Text size="sm">
              <strong>Attestation expirée</strong> pour : {lapsed.join(', ')}.
            </Text>
          ) : (
            <Text size="sm" tone="muted">
              Cette entreprise n’a déclaré aucune activité vérifiée.
            </Text>
          )}

          {/*
            Le numero se compose, il ne se recopie pas. Sur la page qui
            s'appelle « Recontacter », le laisser en texte obligeait a le
            selectionner a la main pour l'appeler — et c'est souvent depuis un
            telephone que cette page se lit.
          */}
          {sheet.phone && (
            <Text size="sm" as="span">
              Téléphone : <Link href={`tel:${sheet.phone}`}>{sheet.phone}</Link>
            </Text>
          )}

          {passportPath && (
            <Link href={passportPath} newTab>
              Voir son passeport
            </Link>
          )}
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <Heading level={3} as="h2">
          Reprendre contact
        </Heading>
        <ContactForm companyId={companyId} companyName={sheet.name} />
      </section>
    </SpaceShell>
  )
}
