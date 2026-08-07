import { createTransport } from 'nodemailer'

/**
 * Envoi d'e-mails.
 *
 * En developpement, SMTP_HOST pointe sur le collecteur local de la pile
 * Supabase : rien ne part vraiment, tout est consultable dans son interface.
 */
const transport = createTransport({
  host: process.env.SMTP_HOST ?? '127.0.0.1',
  port: Number(process.env.SMTP_PORT ?? 54325),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
    : undefined,
})

const FROM = process.env.SMTP_FROM ?? 'Workaround <devis@workaround.local>'

/** Envoi brut, utilise notamment par la passerelle SMS de developpement. */
export async function sendRawMail(input: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  await transport.sendMail({ from: FROM, ...input })
}

export async function sendQuoteLink(input: {
  to: string
  customerName: string
  companyName: string
  quoteNumber: string
  totalInclTax: string
  link: string
}): Promise<void> {
  await transport.sendMail({
    from: FROM,
    to: input.to,
    subject: `Votre devis ${input.quoteNumber} — ${input.companyName}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      `${input.companyName} vous a adressé le devis ${input.quoteNumber}, d'un montant de ${input.totalInclTax} € TTC.`,
      '',
      `Consultez-le et signez-le ici : ${input.link}`,
      '',
      "Ce lien vous est personnel. Si vous n'attendiez pas ce devis, ignorez ce message.",
    ].join('\n'),
    html: `
      <p>Bonjour ${input.customerName},</p>
      <p><strong>${input.companyName}</strong> vous a adressé le devis <strong>${input.quoteNumber}</strong>,
         d'un montant de <strong>${input.totalInclTax} € TTC</strong>.</p>
      <p><a href="${input.link}">Consulter et signer le devis</a></p>
      <p style="color:#666;font-size:12px">Ce lien vous est personnel. Si vous n'attendiez pas ce devis, ignorez ce message.</p>
    `,
  })
}
