import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { staff } from '@/db/schema'
import { createServerSupabase } from './supabase-server'
import { SessionError } from './session'

/**
 * Garde des ecrans internes.
 *
 * Volontairement separee de `currentCompany` : un relecteur n'appartient a
 * aucune entreprise artisanale. Les confondre donnerait a un artisan le pouvoir
 * de valider sa propre attestation — ce qui reduirait a neant la valeur de la
 * verification.
 */
export async function currentStaff(): Promise<{ userId: string; email: string }> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new SessionError('Session expirée')

  const row = await db.query.staff.findFirst({ where: eq(staff.userId, user.id) })
  if (!row) throw new SessionError('Accès réservé')

  return { userId: row.userId, email: row.email }
}
