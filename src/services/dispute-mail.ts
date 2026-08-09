import { createTransport } from 'nodemailer'

const transport = createTransport({
  host: process.env.SMTP_HOST ?? '127.0.0.1',
  port: Number(process.env.SMTP_PORT ?? 54325),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
    : undefined,
})

const FROM = process.env.SMTP_FROM ?? 'Workaround <devis@workaround.local>'

/**
 * La demande d'arbitrage adressee au client.
 *
 * **Un seul message, aucune relance.** Relancer transformerait une demande
 * legitime en pression exercee sur un particulier au benefice d'un
 * professionnel — et le produit existe pour l'inverse.
 *
 * Le message dit ce qu'il en est : ce qu'on lui demande, pourquoi lui, et que
 * ne pas repondre est un choix legitime dont il connait la consequence. Taire
 * cette consequence rendrait le silence manipulable.
 */
export async function sendDisputeLink(input: {
  to: string
  customerName: string
  companyName: string
  quoteNumber: string
  link: string
}): Promise<void> {
  await transport.sendMail({
    from: FROM,
    to: input.to,
    subject: `Une question sur le chantier ${input.quoteNumber}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      `${input.companyName} conteste la façon dont son délai a été mesuré sur le chantier ${input.quoteNumber}, que vous avez signé.`,
      '',
      `Vous êtes la seule personne à savoir ce qui s'est passé. Une question, deux réponses : ${input.link}`,
      '',
      "Vous ne nous devez rien. Si vous ne répondez pas sous quatorze jours, la mesure initiale s'appliquera — c'est-à-dire celle qui est défavorable à l'entreprise.",
    ].join('\n'),
    html: `
      <p>Bonjour ${input.customerName},</p>
      <p><strong>${input.companyName}</strong> conteste la façon dont son délai a été mesuré
         sur le chantier <strong>${input.quoteNumber}</strong>, que vous avez signé.</p>
      <p>Vous êtes la seule personne à savoir ce qui s'est passé.
         <a href="${input.link}">Une question, deux réponses</a>.</p>
      <p style="color:#666;font-size:12px">Vous ne nous devez rien. Si vous ne répondez pas sous
         quatorze jours, la mesure initiale s'appliquera — c'est-à-dire celle qui est défavorable
         à l'entreprise.</p>
    `,
  })
}
