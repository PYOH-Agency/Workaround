import { db } from '@/db/client'
import { evenement } from '@/db/schema'

/**
 * Ecriture dans le journal.
 *
 * Seul point d'entree pour ajouter un fait. Le journal est append-only : il n'y
 * a volontairement ni mise a jour ni suppression ici, et la base les refuse de
 * toute facon.
 */
export interface EvenementEntrant {
  type: string
  sujetType: string
  sujetId: string
  acteurType: 'entreprise' | 'demandeur' | 'systeme'
  acteurId?: string
  entrepriseId?: string
  payload?: Record<string, unknown>
}

export async function enregistrerEvenement(e: EvenementEntrant): Promise<void> {
  await db.insert(evenement).values({
    type: e.type,
    sujetType: e.sujetType,
    sujetId: e.sujetId,
    acteurType: e.acteurType,
    acteurId: e.acteurId ?? null,
    entrepriseId: e.entrepriseId ?? null,
    payload: e.payload ?? {},
  })
}
