import { toInternational } from '@/domain/phone'
import { sendRawMail } from './email'

/**
 * Envoi de SMS.
 *
 * Le code a usage unique porte l'identification du signataire, donc la valeur
 * probante de la signature : cet envoi n'est pas un confort, c'est un maillon
 * de la preuve.
 *
 * En developpement, sans operateur configure, le message part vers le
 * collecteur de mail local : le parcours reste verifiable de bout en bout sans
 * compte tiers ni frais.
 *
 * ATTENTION AVANT MISE EN SERVICE — l'emetteur alphanumerique doit etre
 * declare au registre de l'AF2M, obligatoire depuis 2022 et durci au 1er mars
 * 2026 pour tout trafic vers les reseaux francais, quelle que soit son
 * origine. Seuls A-Z et 0-9 sont admis : ni espace, ni tiret, ni point. La
 * declaration passe par l'operateur et demande du delai.
 */

const SENDER = process.env.SMS_SENDER ?? 'Workaround'

export async function sendSms(to: string, text: string): Promise<void> {
  const recipient = toInternational(to)

  switch (process.env.SMS_PROVIDER) {
    case 'brevo':
      return sendViaBrevo(recipient, text)
    case undefined:
    case '':
      return sendViaMailbox(to, text)
    default:
      throw new Error(`Operateur SMS inconnu : ${process.env.SMS_PROVIDER}`)
  }
}

async function sendViaBrevo(recipient: string, content: string): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      type: 'transactional',
      sender: SENDER,
      recipient,
      content,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    // On ne remonte pas le corps de la reponse : il contient le numero du
    // destinataire, qui n'a rien a faire dans un journal d'erreurs.
    throw new Error(`Envoi du SMS refuse par l'operateur (${response.status})`)
  }
}

/** Passerelle de developpement : le message atterrit dans le collecteur local. */
async function sendViaMailbox(to: string, text: string): Promise<void> {
  await sendRawMail({ to: 'sms@workaround.local', subject: `SMS vers ${to}`, text })
}
