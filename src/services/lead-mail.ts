import { sendRawMail } from '@/services/email'

/**
 * La politique de confidentialite, construite depuis la base de l'application
 * comme les autres liens du produit — jamais ecrite en dur, sans quoi les
 * environnements de recette pointeraient sur la production.
 *
 * Elle est lue a chaque envoi plutot qu'au chargement du module : les tests
 * chargent leur environnement apres les imports.
 */
const privacyUrl = () => `${process.env.NEXT_PUBLIC_APP_URL}/confidentialite`

/**
 * Les messages du parcours de verification.
 *
 * Le demandeur et l'artisan comptent autant, et ne lisent jamais le meme texte.
 * Le detail RGE vit ICI, dans le mail a l'artisan, ou il prouve qu'on connait
 * son metier — et pas sur la page du demandeur, ou il rassurerait a tort.
 *
 * Cet artisan ne nous a rien demande : la base legale est l'interet legitime,
 * et elle ne tient pas sans le lien d'opposition. La donnee RGE, elle, n'a pas
 * ete collectee aupres de lui — l'article 14 impose donc d'en nommer la source
 * (l'annuaire de l'ADEME) ; le lien de confidentialite porte le reste, la
 * finalite, les durees et les droits, sans allonger le message.
 */
export async function sendAttestationRequest(input: {
  to: string
  requesterName: string
  requesterEmail: string
  pageUrl: string
  signupUrl: string
  optoutUrl: string
  /** L'artisan a deja un compte : on ne lui propose pas de s'inscrire. */
  member: boolean
  /** Une qualification RGE deja connue, en une ligne. `null` s'il n'y en a pas. */
  qualification: string | null
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: `${input.requesterName} vous demande votre attestation décennale`,
    text: [
      'Bonjour,',
      '',
      `${input.requesterName} (${input.requesterEmail}) envisage de vous confier des travaux`,
      'et cherche à vérifier votre garantie décennale.',
      '',
      `Voici ce qu’il ou elle a vu : ${input.pageUrl}`,
      ...(input.qualification
        ? [
            '',
            'D’après l’annuaire public des entreprises RGE de l’ADEME, vous êtes',
            `déjà qualifié — ${input.qualification}.`,
            'Il ne manque que votre décennale.',
          ]
        : []),
      '',
      input.member
        ? 'Déposez votre attestation depuis votre espace : elle sera vérifiée, et votre client prévenu.'
        : `Déposez-la ici, c’est gratuit : ${input.signupUrl}`,
      '',
      `Ne plus recevoir ce type de message : ${input.optoutUrl}`,
      `Vos données, leur origine et vos droits : ${privacyUrl()}`,
    ].join('\n'),
  })
}

/**
 * La confirmation d'envoi.
 *
 * Elle porte le lien de la page plutot qu'un simple accuse : c'est le seul
 * moyen pour le demandeur de retrouver ce qu'il a lu, une fois l'onglet ferme.
 *
 * Elle dit « nous venons d'ecrire », et non « nous avons transmis » : ce qui
 * est certain est l'envoi, pas la remise — l'adresse vient souvent d'une source
 * ouverte, et peut etre morte. Promettre la remise ferait attendre trente jours
 * une reponse qui ne pouvait pas venir.
 */
export async function sendRequestConfirmation(input: {
  to: string
  requesterName: string
  pageUrl: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: 'Votre demande d’attestation est partie',
    text: [
      `Bonjour ${input.requesterName},`,
      '',
      'Nous venons d’écrire à l’entreprise.',
      '',
      `Ce que vous avez consulté : ${input.pageUrl}`,
      '',
      'Sans réponse de sa part sous trente jours, nous vous le dirons et nous',
      'effacerons cette demande.',
    ].join('\n'),
  })
}

/** La suite promise au demandeur : ce qui est couvert, et par quoi. */
export async function sendCoveragePublished(input: {
  to: string
  requesterName: string
  companyName: string
  passportUrl: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: `L’attestation de ${input.companyName} est vérifiée`,
    text: [
      `Bonjour ${input.requesterName},`,
      '',
      `${input.companyName} a déposé son attestation, et nous l’avons vérifiée.`,
      '',
      `Voir ce qui est couvert, activité par activité : ${input.passportUrl}`,
      '',
      'Une garantie décennale ne couvre que les activités qu’elle nomme :',
      'vérifiez que les vôtres y figurent.',
    ].join('\n'),
  })
}

/**
 * Trente jours sans reponse.
 *
 * On ne relance pas l'artisan — on rend au demandeur les moyens de se
 * debrouiller sans nous. C'est le dernier message, et la demande est effacee
 * dans la foulee.
 */
export async function sendNoAnswer(input: {
  to: string
  requesterName: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: 'Toujours pas d’attestation — voici quoi faire',
    text: [
      `Bonjour ${input.requesterName},`,
      '',
      'Nous n’avons rien reçu depuis votre demande.',
      '',
      'Demandez l’attestation directement à l’entreprise, et vérifiez trois choses :',
      '— la période de validité couvre la date de signature du devis ;',
      '— les activités nommées correspondent à vos travaux ;',
      '— le nom et le SIRET sur l’attestation sont bien les siens.',
      '',
      'Nous n’en gardons plus trace : cette demande vient d’être effacée.',
    ].join('\n'),
  })
}
