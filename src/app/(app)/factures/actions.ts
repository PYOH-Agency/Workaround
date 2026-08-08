'use server'

import { revalidatePath } from 'next/cache'
import { currentCompany } from '@/lib/session'
import { recordPayment, type PaymentMethod } from '@/services/payments'
import type { InvoiceFormState } from '@/actions/invoices'

/**
 * Encaissements : propre a l'ecran des factures.
 *
 * L'emission, elle, est partagee avec l'ecran du devis — elle vit dans
 * `@/actions/invoices`.
 */
export async function addPayment(
  invoiceId: string,
  state: InvoiceFormState,
  form: FormData,
): Promise<InvoiceFormState> {
  const { companyId } = await currentCompany()

  try {
    await recordPayment({
      companyId,
      invoiceId,
      amount: String(form.get('montant') ?? '0').replace(',', '.'),
      receivedAt: new Date(String(form.get('date'))),
      method: String(form.get('moyen') ?? 'transfer') as PaymentMethod,
      reference: String(form.get('reference') || '') || undefined,
    })
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath(`/factures/${invoiceId}`)
  return { saved: (state.saved ?? 0) + 1 }
}
