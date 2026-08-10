/**
 * Aides pour le parcours de bout en bout.
 *
 * Tout passe par le collecteur de mail de la pile Supabase locale : les liens
 * magiques, les liens de devis et les codes SMS y aboutissent. Aucune de ces
 * fonctions ne peut fonctionner ailleurs qu'en local — c'est exactement la
 * garantie voulue.
 */

import type { Page } from '@playwright/test'

const MAILBOX = process.env.MAILBOX_URL ?? 'http://127.0.0.1:54324'

interface MailSummary {
  ID: string
  Subject: string
  To: { Address: string }[]
}

export async function clearMailbox(): Promise<void> {
  await fetch(`${MAILBOX}/api/v1/messages`, { method: 'DELETE' })
}

/**
 * Les sujets presents dans le collecteur.
 *
 * Existe pour qu'aucun parcours n'ecrive l'adresse du collecteur a la main :
 * celui de `directory-journey` la codait en dur sur 54324 et interrogeait donc
 * la pile d'un autre worktree — il passait tant que les deux n'en faisaient
 * qu'une, et devenait faux des qu'elles se sont separees.
 */
export async function mailSubjects(limit = 20): Promise<string[]> {
  const response = await fetch(`${MAILBOX}/api/v1/messages?limit=${limit}`)
  const { messages = [] } = (await response.json()) as { messages?: MailSummary[] }
  return messages.map((mail) => mail.Subject)
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

/**
 * Le chemin seul, jamais l'hote du message.
 *
 * Les liens des courriels portent `NEXT_PUBLIC_APP_URL`, fige a
 * `localhost:3000`. Les suivre tels quels fait sortir le parcours du serveur
 * qu'il est cense eprouver — et comme les cookies ignorent le port, la session
 * suit et rien ne se voit. Le test passe alors sur l'application d'a cote.
 *
 * Rendre le chemin laisse Playwright le resoudre sur sa `baseURL`.
 */
function pathOf(url: string): string {
  const parsed = new URL(url)
  return `${parsed.pathname}${parsed.search}`
}

export async function magicLinkFor(email: string): Promise<string> {
  const body = await waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /connexion/i.test(mail.Subject),
    `lien de connexion pour ${email}`,
  )
  return pathOf(extract(body, /(https?:\/\/[^\s"<]+auth\/confirm[^\s"<]*)/, 'le lien de connexion'))
}

export async function quoteLinkFor(email: string): Promise<string> {
  const body = await waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /devis/i.test(mail.Subject),
    `lien de devis pour ${email}`,
  )
  return pathOf(extract(body, /(https?:\/\/[^\s"<]+\/d\/[A-Za-z0-9_-]+)/, 'le lien du devis'))
}

export async function smsCodeFor(phone: string): Promise<string> {
  const body = await waitForMail(
    (mail) => mail.Subject.includes(`SMS vers ${phone}`),
    `code SMS pour ${phone}`,
  )
  return extract(body, /\b(\d{6})\b/, 'le code à six chiffres')
}

/**
 * Le lien d'arbitrage adresse au client.
 *
 * Il ne rend que le chemin : le message porte l'adresse de production, et le
 * parcours peut tourner sur un autre port. Naviguer sur l'hote du message
 * testerait l'application d'a cote — le piege s'est deja referme une fois.
 */
export async function disputePathFor(email: string): Promise<string> {
  const body = await waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /Une question sur/.test(mail.Subject),
    `demande d'arbitrage pour ${email}`,
  )
  return `/c/${extract(body, /\/c\/([A-Za-z0-9_-]+)/, 'le jeton d’arbitrage')}`
}

/** Attend la confirmation de signature adressee au client. */
export async function signatureReceiptFor(email: string): Promise<string> {
  return waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /est signé/.test(mail.Subject),
    `confirmation de signature pour ${email}`,
  )
}

/**
 * Vrai si un message du collecteur porte ce texte dans son sujet.
 *
 * **Ne patiente pas**, contrairement a `waitForMail` : elle sert a verifier une
 * ABSENCE, et attendre dix secondes pour conclure qu'il n'y a rien allongerait
 * le parcours sans rien prouver de plus.
 */
export async function mailboxHas(needle: string): Promise<boolean> {
  const response = await fetch(`${MAILBOX}/api/v1/messages?limit=50`)
  const { messages = [] } = (await response.json()) as { messages?: MailSummary[] }
  return messages.some((mail) => mail.Subject.includes(needle))
}

/** La demande relayee a une entreprise. */
export async function contactMailFor(email: string): Promise<string> {
  return waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /Demande reçue/.test(mail.Subject),
    `demande relayée à ${email}`,
  )
}

/**
 * Cree le compte puis le connecte par lien magique.
 *
 * Une seule aide plutot que la sequence recopiee dans neuf parcours : le jour
 * ou la porte change encore, elle change ici.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  const { createAccount } = await import('./fixtures-db')
  await createAccount(email)

  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Recevoir le lien' }).click()
  await page.goto(await magicLinkFor(email))
}
