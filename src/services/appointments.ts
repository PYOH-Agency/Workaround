import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, customer, project, property } from '@/db/schema'
import { assertSchedulable, conflicts, type AppointmentKind } from '@/domain/appointment'
import { groupByDay, weekOf, type Day } from '@/domain/agenda-week'

export interface BookedAppointment {
  id: string
  projectId: string
  kind: AppointmentKind
  startsAt: Date
  endsAt: Date
  note: string | null
  customerName: string
  customerPhone: string | null
  address: string
  projectLabel: string
}

/**
 * Prend un rendez-vous sur un chantier de cette entreprise.
 *
 * Le chevauchement **avertit sans interdire** : un artisan peut legitimement
 * poser deux rendez-vous qui se croisent — un compagnon prend l'un, il passe en
 * coup de vent sur l'autre. L'appelant interroge `conflictingAppointments` et
 * decide de ce qu'il en dit.
 */
export async function bookAppointment(input: {
  companyId: string
  projectId: string
  kind: AppointmentKind
  startsAt: Date
  endsAt: Date
  note: string
}) {
  assertSchedulable(input)

  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, input.projectId), eq(project.companyId, input.companyId)))
  if (!owned) throw new Error('Chantier introuvable')

  const [created] = await db
    .insert(appointment)
    .values({
      projectId: input.projectId,
      companyId: input.companyId,
      kind: input.kind,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      note: input.note.trim() || null,
    })
    .returning()

  return created
}

/** Les rendez-vous de cette entreprise qui chevauchent ce creneau. */
export async function conflictingAppointments(
  companyId: string,
  slot: { startsAt: Date; endsAt: Date },
): Promise<BookedAppointment[]> {
  const around = await appointmentsBetween(
    companyId,
    new Date(slot.startsAt.getTime() - 86_400_000),
    new Date(slot.endsAt.getTime() + 86_400_000),
  )

  return conflicts(slot, around)
}

/**
 * Annule. **Ne supprime pas** : le client a ete prevenu que quelqu'un viendrait,
 * et effacer la ligne effacerait ce fait.
 */
export async function cancelAppointment(companyId: string, appointmentId: string) {
  const [cancelled] = await db
    .update(appointment)
    .set({ status: 'cancelled', cancelledAt: new Date() })
    .where(and(eq(appointment.id, appointmentId), eq(appointment.companyId, companyId)))
    .returning()

  if (!cancelled) throw new Error('Rendez-vous introuvable')
  return cancelled
}

/**
 * La semaine contenant cet instant, groupee par jour de Paris.
 *
 * La fenetre interrogee deborde **volontairement d'un jour de chaque cote** :
 * convertir « minuit a Paris » en instant UTC demanderait le decalage du jour,
 * et sur-lire vingt-quatre heures retire ce calcul du service. La fonction pure
 * ecarte ensuite le surplus.
 */
export async function weekAgenda(
  companyId: string,
  around: Date,
): Promise<Day<BookedAppointment>[]> {
  const week = weekOf(around)
  const from = new Date(`${week[0]}T00:00:00Z`)
  const to = new Date(`${week[6]}T00:00:00Z`)

  const rows = await appointmentsBetween(
    companyId,
    new Date(from.getTime() - 86_400_000),
    new Date(to.getTime() + 2 * 86_400_000),
  )

  return groupByDay(rows, week)
}

async function appointmentsBetween(
  companyId: string,
  from: Date,
  to: Date,
): Promise<BookedAppointment[]> {
  const rows = await db
    .select({
      id: appointment.id,
      projectId: appointment.projectId,
      kind: appointment.kind,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      note: appointment.note,
      customerName: customer.name,
      customerPhone: customer.phone,
      addressLine1: property.addressLine1,
      postalCode: property.postalCode,
      city: property.city,
      projectLabel: project.label,
    })
    .from(appointment)
    .innerJoin(project, eq(project.id, appointment.projectId))
    .innerJoin(customer, eq(customer.id, project.customerId))
    .innerJoin(property, eq(property.id, project.propertyId))
    .where(
      and(
        // La condition d'acces est portee par la requete, comme partout ailleurs.
        eq(appointment.companyId, companyId),
        eq(appointment.status, 'scheduled'),
        gte(appointment.startsAt, from),
        lte(appointment.startsAt, to),
      ),
    )
    .orderBy(asc(appointment.startsAt))

  return rows.map(({ addressLine1, postalCode, city, ...rest }) => ({
    ...rest,
    address: `${addressLine1}, ${postalCode} ${city}`,
  }))
}
