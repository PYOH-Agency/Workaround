import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { membre } from '@/db/schema'
import { creerClientServeur } from './supabase-serveur'

export class ErreurSession extends Error {}

export interface Utilisateur {
  id: string
  email: string
}

export interface Rattachement {
  entrepriseId: string
  role: string
}

export interface Session {
  utilisateurId: string
  email: string
  entrepriseId: string
  role: string
}

/**
 * Toute la logique de decision, sans I/O — c'est elle qui est testee.
 *
 * Les deux causes de rejet sont distinctes a dessein : « session expiree »
 * renvoie vers la connexion, « aucune entreprise » vers l'inscription.
 */
export function resoudreEntreprise(
  utilisateur: Utilisateur | null,
  rattachement: Rattachement | null,
): Session {
  if (!utilisateur) throw new ErreurSession('Session expiree')
  if (!rattachement) throw new ErreurSession('Aucune entreprise rattachee a ce compte')

  return {
    utilisateurId: utilisateur.id,
    email: utilisateur.email,
    entrepriseId: rattachement.entrepriseId,
    role: rattachement.role,
  }
}

export async function entrepriseCourante(): Promise<Session> {
  const supabase = await creerClientServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ligne = user
    ? await db.query.membre.findFirst({ where: eq(membre.utilisateurId, user.id) })
    : null

  return resoudreEntreprise(
    user ? { id: user.id, email: user.email! } : null,
    ligne ? { entrepriseId: ligne.entrepriseId, role: ligne.role } : null,
  )
}
