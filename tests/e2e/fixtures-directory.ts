import { load, userIdFor } from './fixtures-db'

/**
 * Une entreprise publiable : activites declarees, et une attestation validee
 * qui n'en couvre qu'une partie.
 *
 * L'ecart entre `declared` et `covered` est le sujet du parcours : une activite
 * declaree mais non couverte ne doit jamais remonter dans l'annuaire.
 */
export async function coveredCompany(
  email: string,
  activities: { declared: string[]; covered: string[] },
) {
  const { db, schema } = await load()
  const userId = await userIdFor(email)

  const siren = String(510000000 + (Number(userId.replace(/\D/g, '').slice(0, 5)) % 89999))
  const siret = `${siren}00025`
  const legalName = 'PLOMBERIE DE L ANNUAIRE'

  const [row] = await db
    .insert(schema.company)
    .values({
      siret,
      legalName,
      addressLine1: '5 cours de l’Intendance',
      postalCode: '33000',
      city: 'Bordeaux',
      legalFormLabel: 'SAS',
      registrationNumber: 'RCS Bordeaux 000 000 000',
      phone: '0556000000',
      email: 'contact@annuaire-parcours.local',
      vatNumber: 'FR00000000000',
      paymentTerms: 'Solde à réception des travaux.',
      insurerName: 'SMABTP',
      insurerAddress: '114 avenue Émile Zola, 75015 Paris',
      policyNumber: 'D-2026-000999',
      coveredActivities: 'Plomberie, chauffage',
      coverageArea: 'France métropolitaine',
    })
    .returning()

  await db.insert(schema.member).values({ companyId: row.id, userId, email, role: 'owner' })

  await db
    .insert(schema.companyActivity)
    .values(activities.declared.map((activityCode) => ({ companyId: row.id, activityCode })))

  const [certificate] = await db
    .insert(schema.insuranceCertificate)
    .values({
      companyId: row.id,
      kind: 'decennale',
      storagePath: `${row.id}/annuaire.pdf`,
      status: 'validated',
      insurerName: 'SMABTP',
      policyNumber: 'D-2026-000999',
      validFrom: new Date(Date.now() - 86_400_000),
      validUntil: new Date(Date.now() + 300 * 86_400_000),
      reviewedAt: new Date(),
    })
    .returning()

  await db.insert(schema.certificateActivity).values(
    activities.covered.map((activityCode) => ({
      certificateId: certificate.id,
      activityCode,
      sourceLabel: `Libellé lu pour ${activityCode}`,
      confirmedBy: userId,
    })),
  )

  return { id: row.id, siret, legalName, slug: `plomberie-de-l-annuaire-${siren}` }
}
