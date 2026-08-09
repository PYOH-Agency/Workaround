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

/**
 * Le devis a signer.
 *
 * `passportUrl` est l'unique endroit du produit ou le passeport rencontre un
 * vrai particulier : il vient de recevoir un devis a plusieurs milliers
 * d'euros, il est attentif, et c'est l'artisan lui-meme qui nous l'amene. Il
 * est absent quand l'entreprise n'a pas de page publique — on ne promet pas
 * une verification qui n'existe pas.
 */
export async function sendQuoteLink(input: {
  to: string
  customerName: string
  companyName: string
  quoteNumber: string
  totalInclTax: string
  link: string
  passportUrl?: string | null
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
      ...(input.passportUrl
        ? ['', `Vérifier les assurances de ${input.companyName} : ${input.passportUrl}`]
        : []),
      '',
      "Ce lien vous est personnel. Si vous n'attendiez pas ce devis, ignorez ce message.",
    ].join('\n'),
    html: `
      <p>Bonjour ${input.customerName},</p>
      <p><strong>${input.companyName}</strong> vous a adressé le devis <strong>${input.quoteNumber}</strong>,
         d'un montant de <strong>${input.totalInclTax} € TTC</strong>.</p>
      <p><a href="${input.link}">Consulter et signer le devis</a></p>
      ${
        input.passportUrl
          ? `<p><a href="${input.passportUrl}">Vérifier les assurances de ${input.companyName}</a></p>`
          : ''
      }
      <p style="color:#666;font-size:12px">Ce lien vous est personnel. Si vous n'attendiez pas ce devis, ignorez ce message.</p>
    `,
  })
}

/**
 * La confirmation de signature, adressee au client.
 *
 * **C'est le canal d'acces au dossier**, et le seul. Le compte a ete cree par
 * la signature sans que rien ne soit demande a l'ecran : c'est ici que la
 * personne apprend qu'il existe.
 *
 * Pas de mot de passe a choisir, pas de compte a activer — le dire serait
 * inventer une etape qui n'existe pas, et chaque etape annoncee en coute une
 * vraie.
 */
export async function sendSignatureReceipt(input: {
  to: string
  customerName: string
  companyName: string
  quoteNumber: string
  spaceUrl: string
}): Promise<void> {
  await transport.sendMail({
    from: FROM,
    to: input.to,
    subject: `Votre devis ${input.quoteNumber} est signé — ${input.companyName}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      `Votre devis ${input.quoteNumber} est signé. ${input.companyName} en a été informée.`,
      '',
      `Vos chantiers sont réunis ici : ${input.spaceUrl}`,
      'Aucun mot de passe : connectez-vous avec cette adresse, on vous enverra un lien.',
    ].join('\n'),
    html: `
      <p>Bonjour ${input.customerName},</p>
      <p>Votre devis <strong>${input.quoteNumber}</strong> est signé.
         <strong>${input.companyName}</strong> en a été informée.</p>
      <p><a href="${input.spaceUrl}">Retrouver vos chantiers</a></p>
      <p style="color:#666;font-size:12px">Aucun mot de passe : connectez-vous avec cette adresse,
         on vous enverra un lien.</p>
    `,
  })
}
