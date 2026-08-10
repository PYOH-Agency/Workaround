import { sendRawMail } from '@/services/email'

/**
 * L'invitation a rejoindre une entreprise.
 *
 * **Aucun lien porteur d'autorisation.** Le message renvoie vers la page de
 * connexion ordinaire : c'est le lien magique, demande depuis cette adresse-la,
 * qui prouvera l'identite. Un lien d'invitation transferable aurait fait entrer
 * n'importe quel destinataire dans l'entreprise.
 *
 * Le sujet ne contient ni « connexion » ni « devis » : les parcours de bout en
 * bout retrouvent les messages par leur sujet, et une collision ferait suivre
 * le mauvais lien.
 */
export async function sendInvitation(input: {
  to: string
  companyName: string
  link: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: `${input.companyName} vous invite à rejoindre son équipe`,
    text: [
      'Bonjour,',
      '',
      `${input.companyName} vous a ajouté à son équipe sur d’équerre.`,
      '',
      `Connectez-vous avec CETTE adresse pour la rejoindre : ${input.link}`,
      '',
      'Aucun mot de passe : vous recevrez un lien à usage unique.',
      "Si vous n'attendiez pas cette invitation, ignorez ce message.",
    ].join('\n'),
  })
}
