import { describe, it, expect, vi, afterEach } from 'vitest'

const sendRawMail = vi.hoisted(() => vi.fn())
vi.mock('@/services/email', () => ({ sendRawMail }))

const { sendExpiryNotice } = await import('@/services/expiry-notice')

afterEach(() => vi.clearAllMocks())

const certificate = {
  kind: 'decennale' as const,
  validUntil: new Date('2026-09-15'),
  company: { email: 'contact@test.local' as string | null },
}

describe('preavis d echeance', () => {
  it('envoie et le dit', async () => {
    expect(await sendExpiryNotice({ certificate, day: 60 })).toBe(true)
    expect(sendRawMail).toHaveBeenCalledOnce()
  })

  it('enonce la consequence et la voie de recours', async () => {
    // L'article 22.3 interdit la suspension muette : le message doit dire ce
    // qui va disparaitre, ce qui ne bouge pas, et comment contester.
    await sendExpiryNotice({ certificate, day: 30 })
    const { subject, text } = sendRawMail.mock.calls[0][0]

    expect(subject).toContain('30 jours')
    expect(text).toContain('disparaîtront de votre page publique')
    expect(text).toContain('reste inchangé')
    expect(text).toMatch(/réexaminera votre dossier/)
  })

  it("renvoie faux quand l'entreprise n'a aucune adresse", async () => {
    // Et surtout : n'envoie rien. L'appelant s'en sert pour ne PAS inscrire au
    // journal un avertissement qui n'est jamais parti — le journal est la preuve
    // du preavis, et une fausse preuve se retournerait contre nous.
    const unreachable = { ...certificate, company: { email: null } }

    expect(await sendExpiryNotice({ certificate: unreachable, day: 7 })).toBe(false)
    expect(sendRawMail).not.toHaveBeenCalled()
  })
})
