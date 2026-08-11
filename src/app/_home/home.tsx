import { and, count, eq, gte, isNull, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, company, insuranceCertificate, project, quote } from '@/db/schema'
import { can, type Access } from '@/domain/authorization'
import { moneyInFlight } from '@/services/home'
import { pendingTasks } from '@/services/home-tasks'
import { companyMetrics } from '@/services/passport-metrics'
import { companyQuoteLeadTime } from '@/services/quote-lead-time'
import { AppShell } from '@/ui/shells/app-shell'
import { MoneyBand } from './money'
import { Metrics } from './metrics'
import { Onboarding } from './onboarding'
import { Queue } from './queue'
import { Today, type Slot } from './today'

const DAY = 86_400_000

function startOfDay(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * `appointment` ne porte NI libelle NI adresse : il porte un `kind` et un
 * projet. L'agenda compose deja son intitule de la meme facon — voir
 * `services/agenda-feed.ts`, qui joint `project.label`.
 */
function slotsOf(
  rows: { id: string; startsAt: Date; kind: 'visit' | 'work'; projectLabel: string }[],
): Slot[] {
  return rows.map((row) => ({
    id: row.id,
    time: row.startsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    label: row.kind === 'visit' ? 'Visite' : 'Intervention',
    place: row.projectLabel,
  }))
}

export async function Home({
  session,
  companyName,
  now,
}: {
  session: Access & { companyId: string }
  companyName: string
  now: Date
}) {
  const [quotes] = await db
    .select({ total: count() })
    .from(quote)
    .where(eq(quote.companyId, session.companyId))

  if (quotes.total === 0) {
    const [certificate] = await db
      .select({ id: insuranceCertificate.id })
      .from(insuranceCertificate)
      .where(eq(insuranceCertificate.companyId, session.companyId))
      .limit(1)

    const [legal] = await db
      .select({ registrationNumber: company.registrationNumber })
      .from(company)
      .where(eq(company.id, session.companyId))

    return (
      <AppShell access={session} companyName={companyName}>
        <Onboarding
          legalMentionsDone={legal?.registrationNumber != null}
          certificateDone={certificate !== undefined}
        />
      </AppShell>
    )
  }

  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + DAY)
  const afterTomorrow = new Date(today.getTime() + 2 * DAY)

  const appointments = await db
    .select({
      id: appointment.id,
      startsAt: appointment.startsAt,
      kind: appointment.kind,
      projectLabel: project.label,
    })
    .from(appointment)
    .innerJoin(project, eq(appointment.projectId, project.id))
    .where(
      and(
        eq(appointment.companyId, session.companyId),
        eq(appointment.status, 'scheduled'),
        gte(appointment.startsAt, today),
        lt(appointment.startsAt, afterTomorrow),
      ),
    )
    .orderBy(appointment.startsAt)

  /**
   * En parallele : les deux requetes sont independantes.
   *
   * `moneyInFlight` et `pendingTasks` rechargent chacun `settlements()` pour la
   * meme entreprise — c'est une duplication assumee, pas un oubli. Deux
   * requetes de plus sur un seul ecran ne justifient pas de coupler les deux
   * services pour les eviter.
   */
  const [tasks, money] = await Promise.all([
    pendingTasks(session.companyId, session, now),
    can(session, 'invoice.issue') ? moneyInFlight(session.companyId, now) : Promise.resolve(null),
  ])

  const aside = can(session, 'agenda.manage') ? (
    <Today
      today={slotsOf(appointments.filter((a) => a.startsAt < tomorrow))}
      tomorrow={slotsOf(appointments.filter((a) => a.startsAt >= tomorrow))}
    />
  ) : undefined

  const [signed] = await db
    .select({ total: count() })
    .from(quote)
    .where(
      and(
        eq(quote.companyId, session.companyId),
        eq(quote.status, 'signed'),
        isNull(quote.supersedesQuoteId),
      ),
    )

  // Le mois en cours, pour la bande interne.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [issued] = await db
    .select({ total: count() })
    .from(quote)
    .where(and(eq(quote.companyId, session.companyId), gte(quote.createdAt, monthStart)))
  const [signedThisMonth] = await db
    .select({ total: count() })
    .from(quote)
    .where(and(eq(quote.companyId, session.companyId), gte(quote.signedAt, monthStart)))

  const leadTime = await companyQuoteLeadTime(session.companyId, now)

  const passport = can(session, 'passport.manage')
    ? await companyMetrics(session.companyId, now)
    : null

  /**
   * `Rate` rend `{ value, volume }`, et `value` vaut `null` sous les dix
   * observations de `MINIMUM_OBSERVATIONS`. On annonce alors ce qui manque,
   * jamais un taux fabrique sur trop peu de chantiers.
   */
  const rate = (measure: { value: number | null; volume: number }, unit: string) =>
    measure.value === null
      ? {
          value: `Encore ${Math.max(0, 10 - measure.volume)} chantiers`,
          note: 'la mesure s’affiche à partir de 10',
        }
      : {
          value: `${measure.value} ${unit}`,
          note: `sur ${measure.volume} chantiers livrés en 12 mois`,
        }

  return (
    <AppShell access={session} companyName={companyName} aside={aside}>
      {money ? <MoneyBand money={money} signedCount={signed.total} /> : null}
      <Queue tasks={tasks} canWrite={can(session, 'quote.write')} />

      <Metrics
        title="Votre mois"
        metrics={[
          {
            label: `Devis établis en ${now.toLocaleDateString('fr-FR', { month: 'long' })}`,
            value: String(issued.total),
            // Un accord de trop se lit comme une negligence sur un ecran qui
            // parle d'argent.
            note: `dont ${signedThisMonth.total} signé${signedThisMonth.total > 1 ? 's' : ''}`,
          },
          {
            label: 'Délai de remise après visite',
            value: leadTime.value === null ? 'Pas encore mesuré' : `${leadTime.value} j`,
            note:
              leadTime.value === null
                ? 'la mesure demande dix devis remis après visite'
                : `médiane sur ${leadTime.volume} devis remis en 12 mois`,
          },
        ]}
      />

      {passport ? (
        <Metrics
          title="Votre passeport"
          subtitle="visible par vos clients"
          detailHref="/mon-passeport"
          metrics={[
            { label: 'Délai annoncé respecté', ...rate(passport.leadTimeRespect, '%') },
            { label: 'Écart devis → facture', ...rate(passport.quoteToInvoiceGap, '%') },
          ]}
        />
      ) : null}
    </AppShell>
  )
}
