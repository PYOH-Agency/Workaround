import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendSms } from '@/services/sms'

const originalProvider = process.env.SMS_PROVIDER

afterEach(() => {
  process.env.SMS_PROVIDER = originalProvider
  vi.restoreAllMocks()
})

describe('envoi de SMS', () => {
  it('refuse un numero fixe avant tout appel reseau', async () => {
    process.env.SMS_PROVIDER = 'brevo'
    const spy = vi.spyOn(globalThis, 'fetch')

    await expect(sendSms('0556123456', 'code')).rejects.toThrow('mobile')
    expect(spy).not.toHaveBeenCalled()
  })

  it('envoie au format international attendu par l operateur', async () => {
    process.env.SMS_PROVIDER = 'brevo'
    process.env.BREVO_API_KEY = 'cle-de-test'
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }))

    await sendSms('06 12 34 56 78', 'Votre code : 123456')

    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toContain('transactionalSMS')

    const body = JSON.parse(String((init as RequestInit).body))
    expect(body.recipient).toBe('33612345678')
    expect(body.type).toBe('transactional')
    expect(body.content).toContain('123456')
  })

  it('signale un refus de l operateur sans divulguer le numero', async () => {
    process.env.SMS_PROVIDER = 'brevo'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'invalid recipient 33612345678' }), { status: 400 }),
    )

    // Le corps de la reponse contient le numero : il n'a rien a faire dans un
    // journal d'erreurs.
    await expect(sendSms('0612345678', 'code')).rejects.toThrow(/refuse par l'operateur \(400\)/)
    await expect(sendSms('0612345678', 'code')).rejects.not.toThrow(/33612345678/)
  })

  it('rejette un operateur inconnu plutot que d envoyer dans le vide', async () => {
    process.env.SMS_PROVIDER = 'operateur-imaginaire'
    await expect(sendSms('0612345678', 'code')).rejects.toThrow('inconnu')
  })
})
