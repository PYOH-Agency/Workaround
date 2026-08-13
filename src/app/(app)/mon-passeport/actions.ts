'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/access'
import { saveCompanyLogo, removeCompanyLogo } from '@/services/company-logo'

export interface LogoState {
  error?: string
}

export async function saveLogo(_state: LogoState, form: FormData): Promise<LogoState> {
  const { companyId } = await requireCapability('passport.manage')

  const file = form.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choisissez un fichier.' }
  }

  try {
    await saveCompanyLogo({ companyId, file })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Le dépôt du logo a échoué' }
  }

  revalidatePath('/mon-passeport')
  return {}
}

export async function removeLogo(): Promise<void> {
  const { companyId } = await requireCapability('passport.manage')
  await removeCompanyLogo(companyId)
  revalidatePath('/mon-passeport')
}
