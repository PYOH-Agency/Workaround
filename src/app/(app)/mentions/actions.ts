'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { missingLegalMentions } from '@/domain/legal-mentions'
import { recordEvent } from '@/services/events'
import { currentCompany } from '@/lib/session'

export interface LegalFormState {
  error?: string
}

export async function saveLegalMentions(
  _state: LegalFormState,
  form: FormData,
): Promise<LegalFormState> {
  const { companyId } = await currentCompany()

  const text = (key: string) => String(form.get(key) ?? '').trim()

  const mentions = {
    legalFormLabel: text('legal_form_label'),
    registrationNumber: text('registration_number'),
    phone: text('phone'),
    email: text('email'),
    vatExempt: form.get('vat_exempt') === 'on',
    vatNumber: text('vat_number') || null,
    quoteValidityDays: Number(form.get('quote_validity_days') ?? 0) || null,
    paymentTerms: text('payment_terms'),
    insurerName: text('insurer_name'),
    insurerAddress: text('insurer_address'),
    policyNumber: text('policy_number'),
    coveredActivities: text('covered_activities'),
    coverageArea: text('coverage_area'),
  }

  if (missingLegalMentions(mentions).length > 0) {
    return { error: 'Toutes ces mentions sont obligatoires sur un devis. Complétez-les.' }
  }

  await db.update(company).set(mentions).where(eq(company.id, companyId))

  await recordEvent({
    type: 'company.legal_mentions_declared',
    subjectType: 'company',
    subjectId: companyId,
    companyId,
    actorType: 'company',
    // On ne journalise pas le contenu : une reference de contrat d'assurance
    // n'a rien a faire dans un journal immuable. Le fait suffit.
    payload: { declared: true },
  })

  redirect('/devis')
}
