import { sendRawMail } from '@/services/email'

interface ExpiringCertificate {
  kind: 'decennale' | 'rc_pro'
  validUntil: Date | null
  company: { email: string | null }
}

/**
 * Le message de preavis. Renvoie `false` si aucune adresse ne permet de l'envoyer.
 *
 * L'article 22.3 impose d'expliquer QUOI et POURQUOI : une notification qui
 * n'enonce pas sa consequence n'est pas lue, et une suspension muette est
 * illicite. Il rappelle aussi que l'outil reste ouvert — sans quoi le preavis
 * ressemblerait a une menace de fermeture de compte.
 */
export async function sendExpiryNotice(input: {
  certificate: ExpiringCertificate
  day: number
}): Promise<boolean> {
  const { certificate, day } = input
  const address = certificate.company.email
  if (!address || !certificate.validUntil) return false

  const kind =
    certificate.kind === 'decennale' ? 'de garantie décennale' : 'de RC professionnelle'

  await sendRawMail({
    to: address,
    subject: `Votre attestation d’assurance expire dans ${day} jours`,
    text: [
      `Votre attestation ${kind} expire le ${certificate.validUntil.toLocaleDateString('fr-FR')}.`,
      '',
      'Sans nouvelle attestation, les activités qu’elle couvre disparaîtront de votre page publique à cette date. Votre outil de devis et de facturation, lui, reste inchangé.',
      '',
      `Déposez votre nouvelle attestation : ${process.env.NEXT_PUBLIC_APP_URL}/verification`,
      '',
      'Si vous estimez ce retrait injustifié, répondez à ce message : une personne réexaminera votre dossier.',
    ].join('\n'),
  })

  return true
}
