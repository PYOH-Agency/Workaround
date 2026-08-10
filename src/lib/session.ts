import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { member } from '@/db/schema'
import type { Access, Plan, Role } from '@/domain/authorization'
import { claimRequester } from '@/services/requesters'
import { claimInvitation } from '@/services/membership'
import { createServerSupabase } from './supabase-server'

export class SessionError extends Error {}

export interface AuthUser {
  id: string
  email: string
}

export interface Membership {
  companyId: string
  role: Role
  plan: Plan
}

/**
 * La session de l'artisan.
 *
 * Elle etend `Access` : passee telle quelle a `assertCan` ou a `can`, elle
 * suffit. Rien a recomposer au point d'appel, donc rien a y oublier.
 */
export interface Session extends Access {
  userId: string
  email: string
  companyId: string
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
    plan: membership.plan,
  }
}

/**
 * L'appartenance ACTIVE, jointe au plan de son entreprise.
 *
 * `removed_at IS NULL` est porteur : sans lui, retirer un membre ne lui
 * retirerait rien. La jointure ne lit qu'une colonne d'une ligne par cle
 * primaire — le cout est nul, et l'alternative (un second appel dans chaque
 * page) se serait oubliee quelque part.
 */
async function activeMembership(userId: string) {
  return db.query.member.findFirst({
    where: and(eq(member.userId, userId), isNull(member.removedAt)),
    with: { company: { columns: { plan: true } } },
  })
}

export async function currentCompany(): Promise<Session> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const row = user ? await activeMembership(user.id) : null

  // Une invitation acceptee APRES une premiere connexion se rattache ici, sans
  // qu'il faille se reconnecter. Uniquement quand il n'y a pas d'appartenance :
  // la tentative ne coute donc rien au cas courant, qui est tous les autres.
  const joined =
    !row && user?.email ? await claimInvitation(user.id, user.email).catch(() => null) : null

  const found = row ?? (joined ? await activeMembership(user!.id) : null)

  return resolveCompany(
    user ? { id: user.id, email: user.email! } : null,
    found ? { companyId: found.companyId, role: found.role, plan: found.company.plan } : null,
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
