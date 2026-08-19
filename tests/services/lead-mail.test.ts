import { describe, it, expect, vi, beforeEach } from 'vitest'

const sent: { to: string; subject: string; text: string }[] = []

vi.mock('@/services/email', () => ({
  sendRawMail: async (input: { to: string; subject: string; text: string }) => {
    sent.push(input)
  },
}))

const { sendAttestationRequest, sendRequestConfirmation, sendCoveragePublished, sendNoAnswer } =
  await import('@/services/lead-mail')

beforeEach(() => {
  sent.length = 0
})

describe('mail a l artisan', () => {
  const base = {
    to: 'artisan@exemple.fr',
    requesterName: 'Claire',
    requesterEmail: 'claire@exemple.fr',
    pageUrl: 'https://d.test/verification/50769820700036',
    signupUrl: 'https://d.test/inscription?siret=50769820700036',
    optoutUrl: 'https://d.test/stop?e=x&s=y',
  }

  it('nomme le demandeur dans l objet', async () => {
    await sendAttestationRequest({ ...base, member: false, qualification: null })
    expect(sent[0].subject).toBe('Claire vous demande votre attestation décennale')
  })

  it('porte toujours le lien d opposition', async () => {
    await sendAttestationRequest({ ...base, member: false, qualification: null })
    expect(sent[0].text).toContain(base.optoutUrl)
  })

  it('accroche sur le RGE quand on en connait un', async () => {
    await sendAttestationRequest({
      ...base,
      member: false,
      qualification: 'Qualibat, remplacement de chaudière gaz/fioul, valide jusqu’au 7 mars 2028',
    })
    expect(sent[0].text).toContain('Qualibat')
  })

  it('ne parle pas d inscription a quelqu un de deja inscrit', async () => {
    await sendAttestationRequest({ ...base, member: true, qualification: null })
    expect(sent[0].text).not.toContain(base.signupUrl)
  })

  it('mene a l inscription quand l artisan n est pas connu', async () => {
    await sendAttestationRequest({ ...base, member: false, qualification: null })
    expect(sent[0].text).toContain(base.signupUrl)
  })

  // L'artisan ne nous a rien demande : la base legale est l'interet legitime,
  // et elle ne tient pas sans le lien d'opposition. Les deux branches de
  // `member` produisent des corps differents — l'obligation vaut pour les deux,
  // et personne ne doit pouvoir reecrire l'une sans qu'un test ne tombe.
  it.each([{ member: false }, { member: true }])(
    'porte le lien d opposition meme quand member vaut $member',
    async ({ member }) => {
      await sendAttestationRequest({ ...base, member, qualification: null })
      expect(sent[0].text).toContain(base.optoutUrl)
    },
  )

  // La donnee RGE ne vient pas de l'artisan : l'article 14 exige d'en nommer la
  // source, et le lien de confidentialite porte le reste — finalite, durees,
  // droits. Meme exigence que l'opposition, donc meme garde sur les deux
  // branches de `member`.
  //
  // On force une base d'application inhabituelle le temps de l'appel : le lien
  // doit en decouler, et non etre ecrit en dur. Une adresse figee passerait la
  // simple recherche de « /confidentialite ».
  it.each([{ member: false }, { member: true }])(
    'porte le lien de confidentialite, construit depuis la base, quand member vaut $member',
    async ({ member }) => {
      const previous = process.env.NEXT_PUBLIC_APP_URL
      process.env.NEXT_PUBLIC_APP_URL = 'https://base.test'
      try {
        await sendAttestationRequest({ ...base, member, qualification: null })
      } finally {
        process.env.NEXT_PUBLIC_APP_URL = previous
      }
      expect(sent[0].text).toContain('https://base.test/confidentialite')
    },
  )

  it('nomme la source de la donnee RGE, qui ne vient pas de l artisan', async () => {
    await sendAttestationRequest({
      ...base,
      member: false,
      qualification: 'Qualibat, remplacement de chaudière gaz/fioul, valide jusqu’au 7 mars 2028',
    })
    expect(sent[0].text).toContain('ADEME')
  })
})

describe('mails au demandeur', () => {
  it('confirme l envoi avec le lien de la page', async () => {
    await sendRequestConfirmation({
      to: 'claire@exemple.fr',
      requesterName: 'Claire',
      pageUrl: 'https://d.test/verification/50769820700036',
    })
    expect(sent[0].text).toContain('https://d.test/verification/50769820700036')
  })

  it('annonce la couverture publiee avec le lien du passeport', async () => {
    await sendCoveragePublished({
      to: 'claire@exemple.fr',
      requesterName: 'Claire',
      companyName: 'MAISON DUPONT',
      passportUrl: 'https://d.test/artisan/maison-dupont',
    })
    expect(sent[0].subject).toContain('MAISON DUPONT')
    expect(sent[0].text).toContain('https://d.test/artisan/maison-dupont')
  })

  it('explique quoi faire quand rien n est arrive', async () => {
    await sendNoAnswer({ to: 'claire@exemple.fr', requesterName: 'Claire' })
    expect(sent[0].text).toContain('attestation')
  })

  // Un signal positif adresse au demandeur vaut caution : il rassurerait sur
  // une entreprise dont l'assurance reste inconnue. Le detail RGE, lui, vit
  // dans le mail a l'artisan, jamais ici.
  //
  // On cherche des mots isoles plutot que des phrases entieres : une formule
  // recopiee mot pour mot ne tiendrait pas a la premiere reecriture, tandis
  // qu'un simple `includes('assur')` accuserait a tort « attestation
  // d'assurance », qui est neutre. Les bornes de mot laissent donc passer
  // « assurance » et arretent « assuré », « assurée », « assurés ».
  const bannedSignals = [/\bassuré/i, /\bRGE\b/, /\bfiable/i]

  it('ne porte aucun signal positif sur l entreprise, dans aucun des trois mails', async () => {
    await sendRequestConfirmation({
      to: 'claire@exemple.fr',
      requesterName: 'Claire',
      pageUrl: 'https://d.test/verification/50769820700036',
    })
    await sendCoveragePublished({
      to: 'claire@exemple.fr',
      requesterName: 'Claire',
      companyName: 'MAISON DUPONT',
      passportUrl: 'https://d.test/artisan/maison-dupont',
    })
    await sendNoAnswer({ to: 'claire@exemple.fr', requesterName: 'Claire' })

    expect(sent).toHaveLength(3)
    for (const mail of sent) {
      for (const signal of bannedSignals) {
        expect(`${mail.subject}\n${mail.text}`).not.toMatch(signal)
      }
    }
  })
})
