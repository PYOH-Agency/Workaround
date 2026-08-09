import { describe, it, expect, vi, afterEach } from 'vitest'

const sendMail = vi.hoisted(() => vi.fn())
vi.mock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }))

const { sendQuoteLink, sendSignatureReceipt } = await import('@/services/email')

afterEach(() => vi.clearAllMocks())

const QUOTE = {
  to: 'paul@client.test',
  customerName: 'Paul Martin',
  companyName: 'GARANCE PLOMBERIE',
  quoteNumber: 'D-2026-000123',
  totalInclTax: '4 250,00',
  link: 'https://dequerre.test/d/jeton',
}

const sent = () => sendMail.mock.calls[0][0] as { text: string; html: string }

/**
 * Le courriel de devis est le seul chemin que le produit possede vers un vrai
 * particulier, et c'est l'artisan lui-meme qui nous l'amene. Ce que ce fichier
 * protege n'est pas une mise en forme : c'est ce chemin.
 */
describe('courriel de devis', () => {
  it('mene au passeport quand l’entreprise en a un', async () => {
    await sendQuoteLink({ ...QUOTE, passportUrl: 'https://dequerre.test/p/garance-507698207' })

    const mail = sent()
    expect(mail.text).toContain(
      'Vérifier les assurances de GARANCE PLOMBERIE : https://dequerre.test/p/garance-507698207',
    )
    expect(mail.html).toContain('href="https://dequerre.test/p/garance-507698207"')
  })

  it('n’en dit rien quand l’entreprise n’a pas de page publique', async () => {
    await sendQuoteLink({ ...QUOTE, passportUrl: null })

    const mail = sent()
    // Un lien vers une page absente serait pire que pas de lien, et au pire
    // moment : celui ou le client evalue le serieux de l'entreprise.
    expect(mail.text).not.toContain('Vérifier les assurances')
    expect(mail.html).not.toContain('Vérifier les assurances')
    // Le devis, lui, part toujours.
    expect(mail.text).toContain(QUOTE.link)
  })
})

describe('confirmation de signature', () => {
  it('mene au dossier, sans annoncer d’etape supplementaire', async () => {
    // Le compte a ete cree par la signature : proposer d'en creer un ici
    // laisserait croire qu'il reste quelque chose a faire.
    await sendSignatureReceipt({
      to: 'paul@client.test',
      customerName: 'Paul Martin',
      companyName: 'GARANCE PLOMBERIE',
      quoteNumber: 'D2026-0001',
      spaceUrl: 'https://dequerre.test/mes-logements',
    })

    const mail = sent()
    expect(mail.text).toContain('https://dequerre.test/mes-logements')
    expect(mail.html).toContain('href="https://dequerre.test/mes-logements"')
    expect(mail.text).not.toMatch(/(choisir|créer|définir) (un |votre )?mot de passe/i)
  })
})
