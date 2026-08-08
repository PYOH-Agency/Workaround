import { sendRawMail } from '@/services/email'
import type { Anomaly } from '@/domain/anomaly'

/**
 * Le releve des anomalies bloquantes.
 *
 * **Seules les bloquantes alertent.** Une attestation qui attend deux jours n'a
 * pas a reveiller quelqu'un un dimanche ; une source morte, si. Alerter sur tout
 * revient a n'alerter sur rien.
 *
 * Un seul message listant tout, jamais un message par anomalie : une boite
 * inondee se filtre, et un filtre ne se lit plus.
 *
 * Renvoie le nombre de messages effectivement envoyes.
 */
export async function sendAnomalyDigest(
  anomalies: Anomaly[],
  recipients: string[],
): Promise<number> {
  const blocking = anomalies.filter((a) => a.severity === 'blocking')
  if (blocking.length === 0 || recipients.length === 0) return 0

  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const text = [
    `${blocking.length} anomalie(s) bloquante(s) demandent une intervention :`,
    '',
    ...blocking.map((a) => `— ${a.detail}`),
    '',
    `La file complète : ${base}/supervision`,
  ].join('\n')

  for (const to of recipients) {
    await sendRawMail({
      to,
      subject: `D’équerre — ${blocking.length} anomalie(s) bloquante(s)`,
      text,
    })
  }

  return recipients.length
}
