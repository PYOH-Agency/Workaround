'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, member } from '@/db/schema'
import { findEstablishment } from '@/services/company-lookup'
import { recordEvent } from '@/services/events'
import { createServerSupabase } from '@/lib/supabase-server'

export interface SignUpState {
  error?: string
}

export async function signUp(_state: SignUpState, form: FormData): Promise<SignUpState> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  const alreadyMember = await db.query.member.findFirst({ where: eq(member.userId, user.id) })
  if (alreadyMember) redirect('/')

  let establishment
  try {
    establishment = await findEstablishment(String(form.get('siret') ?? ''))
  } catch (e) {
    return { error: (e as Error).message }
  }

  if (!establishment.active) {
    return { error: "Cet établissement n'est plus actif au répertoire des entreprises." }
  }

  const alreadyRegistered = await db.query.company.findFirst({
    where: eq(company.siret, establishment.siret),
  })
  if (alreadyRegistered) {
    return { error: 'Cette entreprise est déjà inscrite. Demandez une invitation à son responsable.' }
  }

  const [created] = await db
    .insert(company)
    .values({
      siret: establishment.siret,
      legalName: establishment.legalName,
      legalForm: establishment.legalForm,
      addressLine1: establishment.addressLine1,
      postalCode: establishment.postalCode,
      city: establishment.city,
      foundedOn: establishment.foundedOn,
      // Prerempli depuis l'annuaire : autant de mentions obligatoires que
      // l'artisan n'aura pas a saisir, donc pas a saisir de travers.
      legalFormLabel: establishment.legalFormLabel,
      vatNumber: establishment.vatNumber,
    })
    .returning()

  await db.insert(member).values({
    companyId: created.id,
    userId: user.id,
    email: user.email!,
    role: 'owner',
  })

  await recordEvent({
    type: 'company.created',
    subjectType: 'company',
    subjectId: created.id,
    companyId: created.id,
    actorType: 'company',
    actorId: user.id,
    // Le RGE est releve des l'inscription : c'est l'une des habilitations
    // bloquantes de M3, et l'API la donne gratuitement.
    payload: { siret: created.siret, rge: establishment.rge },
  })

  redirect('/')
}
