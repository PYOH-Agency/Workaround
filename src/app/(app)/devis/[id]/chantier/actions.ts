'use server'

import { revalidatePath } from 'next/cache'
import { currentCompany } from '@/lib/session'
import { publishPost } from '@/services/chantier-posts'

export interface PostState {
  error?: string
  published?: boolean
}

/**
 * L'artisan publie sur le fil que son client lit.
 *
 * Rien n'est renvoye au formulaire pour le vider : `revalidatePath` reconstruit
 * la page, et la publication apparait dans le fil — c'est la confirmation la
 * plus honnete qui soit.
 */
export async function publish(
  quoteId: string,
  _state: PostState,
  form: FormData,
): Promise<PostState> {
  const { companyId } = await currentCompany()

  const photos = form
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  try {
    await publishPost({ companyId, quoteId, body: String(form.get('body') ?? ''), photos })
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/devis/${quoteId}/chantier`)
  return { published: true }
}
