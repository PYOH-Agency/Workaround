import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, event, insuranceCertificate } from '@/db/schema'
import { noticesDue } from '@/domain/expiry'
import { recordEvent } from '@/services/events'
import { runLegalChecks } from '@/services/legal-checks'
import { sendExpiryNotice } from '@/services/expiry-notice'

export const runtime = 'nodejs'

/**
 * Preavis d'echeance et re-controle des sources ouvertes.
 *
 * Ce travail de fond ne modifie AUCUN etat de visibilite : la visibilite se
 * calcule a la lecture. Il ne fait que prevenir et constater — c'est ce qui le
 * rend incapable de faire diverger quoi que ce soit.
 */
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Non autorisé', { status: 401 })
  }

  const now = new Date()
  const certificates = await db.query.insuranceCertificate.findMany({
    where: and(
      eq(insuranceCertificate.status, 'validated'),
      isNotNull(insuranceCertificate.validUntil),
    ),
    with: { company: true },
  })

  let sent = 0
  // Une entreprise sans adresse ne peut pas etre prevenue. On la compte pour
  // que le suivi la voie : sans preavis, la suspension serait irreguliere.
  let unreachable = 0

  for (const certificate of certificates) {
    const history = await db
      .select({ payload: event.payload })
      .from(event)
      .where(and(eq(event.subjectId, certificate.id), eq(event.type, 'certificate.expiring')))

    const alreadySent = history.map((h) => Number((h.payload as { day: number }).day))
    const [day] = noticesDue(certificate.validUntil!, now, alreadySent)
    if (day === undefined) continue

    // L'evenement n'est ecrit QUE si le preavis est parti. Le journal est la
    // preuve du preavis exige par l'article 22.3 : y inscrire un avertissement
    // qui n'a jamais quitte le serveur fabriquerait une fausse preuve, et
    // l'artisan suspendu sans avoir rien recu se verrait opposer notre journal.
    if (!(await sendExpiryNotice({ certificate, day }))) {
      unreachable++
      continue
    }

    await recordEvent({
      type: 'certificate.expiring',
      subjectType: 'certificate',
      subjectId: certificate.id,
      companyId: certificate.companyId,
      actorType: 'system',
      payload: { day, validUntil: certificate.validUntil!.toISOString() },
    })

    sent++
  }

  // Les controles legaux tournent au meme rythme et au meme declencheur :
  // multiplier les planifications multiplierait les facons de tomber en panne.
  const companies = await db.select({ id: company.id, siret: company.siret }).from(company)
  for (const row of companies) await runLegalChecks(row.id, row.siret)

  return Response.json({
    checked: certificates.length,
    sent,
    unreachable,
    companies: companies.length,
  })
}
