/**
 * Aides pour le parcours de bout en bout.
 *
 * Tout passe par le collecteur de mail de la pile Supabase locale : les liens
 * magiques, les liens de devis et les codes SMS y aboutissent. Aucune de ces
 * fonctions ne peut fonctionner ailleurs qu'en local — c'est exactement la
 * garantie voulue.
 */

const MAILBOX = process.env.MAILBOX_URL ?? 'http://127.0.0.1:54324'

interface MailSummary {
  ID: string
  Subject: string
  To: { Address: string }[]
}

export async function clearMailbox(): Promise<void> {
  await fetch(`${MAILBOX}/api/v1/messages`, { method: 'DELETE' })
}

/** Attend un message correspondant au predicat, puis renvoie son corps texte. */
async function waitForMail(
  matches: (mail: MailSummary) => boolean,
  description: string,
): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(`${MAILBOX}/api/v1/messages?limit=30`)
    const { messages = [] } = (await response.json()) as { messages?: MailSummary[] }
    const found = messages.find(matches)

    if (found) {
      const detail = await fetch(`${MAILBOX}/api/v1/message/${found.ID}`)
      const body = (await detail.json()) as { HTML?: string; Text?: string }
      return `${body.HTML ?? ''}\n${body.Text ?? ''}`
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Aucun message correspondant à « ${description} » après 10 s`)
}

function extract(body: string, pattern: RegExp, what: string): string {
  const match = pattern.exec(body.replace(/&amp;/g, '&'))
  if (!match) throw new Error(`Impossible d'extraire ${what} du message`)
  return match[1]
}

export async function magicLinkFor(email: string): Promise<string> {
  const body = await waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /connexion/i.test(mail.Subject),
    `lien de connexion pour ${email}`,
  )
  return extract(body, /(https?:\/\/[^\s"<]+auth\/confirm[^\s"<]*)/, 'le lien de connexion')
}

export async function quoteLinkFor(email: string): Promise<string> {
  const body = await waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /devis/i.test(mail.Subject),
    `lien de devis pour ${email}`,
  )
  return extract(body, /(https?:\/\/[^\s"<]+\/d\/[A-Za-z0-9_-]+)/, 'le lien du devis')
}

export async function smsCodeFor(phone: string): Promise<string> {
  const body = await waitForMail(
    (mail) => mail.Subject.includes(`SMS vers ${phone}`),
    `code SMS pour ${phone}`,
  )
  return extract(body, /\b(\d{6})\b/, 'le code à six chiffres')
}
