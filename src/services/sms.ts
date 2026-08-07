import { sendRawMail } from './email'

/**
 * Envoi de SMS.
 *
 * Aucun operateur n'est encore branche. En developpement, le message part vers
 * le collecteur de mail local : il reste consultable et le parcours complet est
 * verifiable, sans compte tiers ni frais.
 *
 * Un operateur devra etre choisi avant toute mise en service — le code SMS
 * porte l'identification du signataire, donc la valeur probante de la
 * signature. Ordre de grandeur : 0,045 EUR par message.
 */
export async function sendSms(to: string, text: string): Promise<void> {
  if (process.env.SMS_PROVIDER) {
    throw new Error(`Operateur SMS « ${process.env.SMS_PROVIDER} » non implemente`)
  }

  await sendRawMail({
    to: 'sms@workaround.local',
    subject: `SMS vers ${to}`,
    text,
  })
}
