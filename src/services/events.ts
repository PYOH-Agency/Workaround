import { db } from '@/db/client'
import { event } from '@/db/schema'

/**
 * Ecriture dans le journal.
 *
 * Seul point d'entree pour ajouter un fait. Le journal est append-only : il n'y
 * a volontairement ni mise a jour ni suppression ici, et la base les refuse de
 * toute facon.
 */
export interface EventInput {
  type: string
  subjectType: string
  subjectId: string
  actorType: 'company' | 'customer' | 'system'
  actorId?: string
  companyId?: string
  payload?: Record<string, unknown>
}

export async function recordEvent(input: EventInput): Promise<void> {
  await db.insert(event).values({
    type: input.type,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    companyId: input.companyId ?? null,
    payload: input.payload ?? {},
  })
}
