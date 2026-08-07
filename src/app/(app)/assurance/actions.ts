'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { missingInsuranceMentions } from '@/domain/insurance'
import { recordEvent } from '@/services/events'
import { currentCompany } from '@/lib/session'

export interface InsuranceFormState {
  error?: string
}

export async function saveInsurance(
  _state: InsuranceFormState,
  form: FormData,
): Promise<InsuranceFormState> {
  const { companyId } = await currentCompany()

  const mentions = {
    insurerName: String(form.get('insurer_name') ?? '').trim(),
    insurerAddress: String(form.get('insurer_address') ?? '').trim(),
    policyNumber: String(form.get('policy_number') ?? '').trim(),
    coveredActivities: String(form.get('covered_activities') ?? '').trim(),
    coverageArea: String(form.get('coverage_area') ?? '').trim(),
  }

  if (missingInsuranceMentions(mentions).length > 0) {
    return { error: 'Toutes les mentions sont obligatoires sur un devis. Complétez-les.' }
  }

  await db.update(company).set(mentions).where(eq(company.id, companyId))

  await recordEvent({
    type: 'company.insurance_declared',
    subjectType: 'company',
    subjectId: companyId,
    companyId,
    actorType: 'company',
    // On ne journalise pas le contenu : la reference de contrat n'a rien a
    // faire dans un journal immuable. Le fait suffit.
    payload: { declared: true },
  })

  redirect('/devis')
}
