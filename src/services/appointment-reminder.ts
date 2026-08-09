import { sendRawMail } from '@/services/email'

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Le rappel de la veille. Rend `false` si aucune adresse ne permet de l'envoyer.
 *
 * **Un seul, aucune relance.** Et le message dit quoi faire si le client ne
 * peut plus : il n'a pas de compte, il ne peut pas annuler lui-meme, et le lui
 * cacher ferait un rendez-vous manque plutot qu'un rendez-vous deplace.
 *
 * Le booleen n'est pas decoratif : l'appelant n'inscrit l'evenement au journal
 * que si le message est reellement parti — la lecon de M3.
 */
export async function sendAppointmentReminder(input: {
  to: string | null
  customerName: string
  companyName: string
  companyPhone: string | null
  startsAt: Date
  address: string
  label: string
}): Promise<boolean> {
  if (!input.to?.trim()) return false

  await sendRawMail({
    to: input.to,
    subject: `Rendez-vous demain avec ${input.companyName}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      `${input.companyName} passe ${MOMENT.format(input.startsAt)} pour : ${input.label}.`,
      `Adresse : ${input.address}`,
      '',
      input.companyPhone
        ? `Si vous ne pouvez pas être présent, prévenez-la au ${input.companyPhone}.`
        : 'Si vous ne pouvez pas être présent, prévenez-la.',
    ].join('\n'),
  })

  return true
}
