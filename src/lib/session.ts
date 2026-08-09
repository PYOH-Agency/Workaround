import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { member } from '@/db/schema'
import { claimRequester } from '@/services/requesters'
import { createServerSupabase } from './supabase-server'

export class SessionError extends Error {}

export interface AuthUser {
  id: string
  email: string
}

export interface Membership {
  companyId: string
  role: string
}

export interface Session {
  userId: string
  email: string
  companyId: string
  role: string
}

/**
 * Toute la logique de decision, sans I/O — c'est elle qui est testee.
 *
 * Les deux causes de rejet sont distinctes a dessein : « session expiree »
 * renvoie vers la connexion, « aucune entreprise » vers l'inscription.
 */
export function resolveCompany(user: AuthUser | null, membership: Membership | null): Session {
  if (!user) throw new SessionError('Session expiree')
  if (!membership) throw new SessionError('Aucune entreprise rattachee a ce compte')

  return {
    userId: user.id,
    email: user.email,
    companyId: membership.companyId,
    role: membership.role,
  }
}

export async function currentCompany(): Promise<Session> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const row = user ? await db.query.member.findFirst({ where: eq(member.userId, user.id) }) : null

  return resolveCompany(
    user ? { id: user.id, email: user.email! } : null,
    row ? { companyId: row.companyId, role: row.role } : null,
  )
}

export interface RequesterSession {
  userId: string
  email: string
  requesterId: string
}

/**
 * Le pendant de `resolveCompany` pour l'autre public.
 *
 * Les deux causes de rejet restent distinctes : « session expiree » renvoie
 * vers la connexion, « aucun dossier » signale un compte qui n'a jamais signe
 * — et qui n'est pas pour autant un artisan a inscrire.
 */
export function resolveRequester(
  user: AuthUser | null,
  found: { requesterId: string } | null,
): RequesterSession {
  if (!user) throw new SessionError('Session expiree')
  if (!found) throw new SessionError('Aucun dossier rattache a ce compte')

  return { userId: user.id, email: user.email, requesterId: found.requesterId }
}

export async function currentRequester(): Promise<RequesterSession> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // La revendication a lieu ici plutot qu'au seul atterrissage du lien magique :
  // ainsi un dossier cree APRES la premiere connexion se rattache tout seul,
  // sans que la personne ait a se reconnecter.
  const row = user?.email ? await claimRequester(user.id, user.email) : null

  return resolveRequester(
    user ? { id: user.id, email: user.email! } : null,
    row ? { requesterId: row.id } : null,
  )
}
