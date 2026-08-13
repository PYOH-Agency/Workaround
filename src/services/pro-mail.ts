import { sendRawMail } from '@/services/email'

/** Le backoffice, qui bascule le plan a la main. */
const BACKOFFICE_EMAIL = 'bonjour@dequerre.fr'

/**
 * La demande d'activation de l'offre Pro, adressee au backoffice.
 *
 * L'encaissement n'est pas automatise : l'activation reste un geste humain. Ce
 * message porte de quoi l'accomplir sans un aller-retour — la raison sociale et
 * le SIRET —, la ou l'ancien `mailto` reposait sur ce que l'artisan voulait
 * bien recopier. Il remplace ce `mailto` : la demande part desormais de
 * l'application, tracee au journal, plutot que du client mail de l'artisan.
 */
export async function sendProRequest(input: {
  legalName: string
  siret: string
}): Promise<void> {
  await sendRawMail({
    to: BACKOFFICE_EMAIL,
    subject: `Offre Pro — activation demandée · ${input.legalName}`,
    text: [
      'Une entreprise demande l’activation de l’offre Pro.',
      '',
      input.legalName,
      `SIRET ${input.siret}`,
      '',
      'À basculer depuis le backoffice (Entreprises).',
    ].join('\n'),
  })
}
