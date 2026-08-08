import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Anomaly } from '@/domain/anomaly'

const sendRawMail = vi.hoisted(() => vi.fn())
vi.mock('@/services/email', () => ({ sendRawMail }))

const { sendAnomalyDigest } = await import('@/services/anomaly-digest')

afterEach(() => vi.clearAllMocks())

const anomaly = (severity: Anomaly['severity']): Anomaly => ({
  type: 'source_silent',
  severity,
  subjectId: 'bodacc',
  since: new Date('2026-08-01'),
  detail: 'Aucun constat de bodacc depuis le 01/08/2026',
  href: '/supervision',
  fingerprint: 'bodacc|x',
})

describe('releve quotidien', () => {
  it('n envoie rien quand rien ne bloque', async () => {
    // Alerter sur tout revient a n'alerter sur rien : une attestation qui
    // attend deux jours n'a pas a reveiller quelqu'un un dimanche.
    expect(await sendAnomalyDigest([anomaly('attention'), anomaly('signal')], ['a@b.fr'])).toBe(0)
    expect(sendRawMail).not.toHaveBeenCalled()
  })

  it('n envoie rien quand la file est vide', async () => {
    expect(await sendAnomalyDigest([], ['a@b.fr'])).toBe(0)
    expect(sendRawMail).not.toHaveBeenCalled()
  })

  it('envoie un seul releve, pas un message par anomalie', async () => {
    const sent = await sendAnomalyDigest([anomaly('blocking'), anomaly('blocking')], ['a@b.fr'])

    expect(sent).toBe(1)
    expect(sendRawMail).toHaveBeenCalledOnce()
    expect(sendRawMail.mock.calls[0][0].subject).toContain('2')
    expect(sendRawMail.mock.calls[0][0].text).toContain('Aucun constat de bodacc')
  })

  it('ecrit a chaque relecteur', async () => {
    expect(await sendAnomalyDigest([anomaly('blocking')], ['a@b.fr', 'c@d.fr'])).toBe(2)
    expect(sendRawMail).toHaveBeenCalledTimes(2)
  })

  it('n envoie rien s il n y a aucun relecteur', async () => {
    expect(await sendAnomalyDigest([anomaly('blocking')], [])).toBe(0)
  })
})
