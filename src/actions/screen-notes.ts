'use server'

import { refresh } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'
import type { ScreenNoteKey } from '@/domain/screen-notes'
import { dismissNote, reopenNotes } from '@/services/screen-notes'

/**
 * Refermer et rouvrir les notices — couche partagee, comme la sortie.
 *
 * Les deux coquilles connectees s'en servent : l'atelier de l'artisan et
 * l'espace du demandeur. La loger dans l'une obligerait l'autre a en dependre,
 * et `check:feature-isolation` le refuserait a bon droit.
 *
 * Ni `currentCompany` ni `currentRequester` ici : ces deux-la exigent une
 * appartenance ou un dossier, et une notice n'appartient qu'au compte. C'est
 * `auth.users` qu'on interroge, comme la table elle-meme le fait.
 */
async function currentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

/**
 * `refresh()` et non `revalidatePath` : rien n'est en cache — l'ecran relit ses
 * rejets a chaque rendu. Ce qu'il faut, c'est refaire le rendu de la route
 * courante, et une action qui n'invalide rien n'en declenche aucun : la carte
 * resterait a l'ecran apres qu'on l'a fermee.
 *
 * Sans session on ne fait rien, et on rafraichit quand meme : c'est la garde de
 * la page qui saura renvoyer vers la porte, et elle le dira mieux qu'ici.
 */
export async function dismissScreenNote(noteKey: ScreenNoteKey): Promise<void> {
  const userId = await currentUserId()
  if (userId) await dismissNote(userId, noteKey)

  refresh()
}

/** « Revoir les explications » : on efface les rejets (spec A2 §4). */
export async function reopenScreenNotes(): Promise<void> {
  const userId = await currentUserId()
  if (userId) await reopenNotes(userId)

  refresh()
}
