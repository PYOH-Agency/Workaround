import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, company, customer, event, project, property } from '@/db/schema'
import { remindersDue } from '@/domain/reminder'
import { recordEvent } from '@/services/events'
import { sendAppointmentReminder } from '@/services/appointment-reminder'

/**
 * Les rappels de la veille, envoyes par le travail de fond quotidien.
 *
 * La fenetre interrogee est **volontairement large de deux jours** : convertir
 * « demain a Paris » en bornes UTC demanderait le decalage du jour, et la
 * fonction pure tranche ensuite. Meme choix qu'a l'agenda de M7·A.
 */
export async function runAppointmentReminders(now: Date) {
  const rows = await db
    .select({
      id: appointment.id,
      companyId: appointment.companyId,
      startsAt: appointment.startsAt,
      status: appointment.status,
      customerName: customer.name,
      customerEmail: customer.email,
      companyName: company.legalName,
      companyPhone: company.phone,
      addressLine1: property.addressLine1,
      postalCode: property.postalCode,
      city: property.city,
      label: project.label,
    })
    .from(appointment)
    .innerJoin(project, eq(project.id, appointment.projectId))
    .innerJoin(customer, eq(customer.id, project.customerId))
    .innerJoin(property, eq(property.id, project.propertyId))
    .innerJoin(company, eq(company.id, appointment.companyId))
    .where(
      and(
        gte(appointment.startsAt, new Date(now.getTime() - 86_400_000)),
        lte(appointment.startsAt, new Date(now.getTime() + 3 * 86_400_000)),
      ),
    )

  const reminded = await db
    .select({ subjectId: event.subjectId })
    .from(event)
    .where(eq(event.type, 'appointment.reminded'))

  const already = new Set(reminded.map((row) => row.subjectId))

  const due = remindersDue(
    rows.map((row) => ({ ...row, alreadyReminded: already.has(row.id) })),
    now,
  )

  let sent = 0
  // Un client sans adresse ne peut pas etre prevenu. On le compte pour que le
  // suivi le voie, plutot que de le faire disparaitre du bilan.
  let unreachable = 0

  for (const item of due) {
    const left = await sendAppointmentReminder({
      to: item.customerEmail,
      customerName: item.customerName,
      companyName: item.companyName,
      companyPhone: item.companyPhone,
      startsAt: item.startsAt,
      address: `${item.addressLine1}, ${item.postalCode} ${item.city}`,
      label: item.label,
    })

    if (!left) {
      unreachable++
      continue
    }

    // Ecrit APRES l'envoi, et seulement s'il a eu lieu. C'est la lecon de M3 :
    // un preavis jamais envoye s'y etait consigne comme envoye, fabriquant une
    // preuve fausse.
    await recordEvent({
      type: 'appointment.reminded',
      subjectType: 'appointment',
      subjectId: item.id,
      companyId: item.companyId,
      actorType: 'system',
    })

    sent++
  }

  return { due: due.length, sent, unreachable }
}
