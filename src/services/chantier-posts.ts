import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { chantierPhoto, chantierPost, quote } from '@/db/schema'
import { rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'
import { createServiceSupabase } from '@/lib/supabase-server'

/** Un message de chantier, lu par un particulier. Au-dela, c'est un rapport. */
export const MAX_POST_LENGTH = 500

/**
 * Quatre photos par publication.
 *
 * La borne n'est pas technique : sans elle le fil devient un album, c'est-a-dire
 * un autre produit — avec sa conservation, sa moderation et ses attentes.
 */
export const MAX_PHOTOS = 4

const SIGNED_URL_SECONDS = 300

export async function publishPost(input: {
  companyId: string
  quoteId: string
  body: string
  photos: File[]
}) {
  const body = input.body.trim()
  if (!body) throw new Error('Le message est vide')
  if (body.length > MAX_POST_LENGTH) {
    throw new Error(`Message trop long (${MAX_POST_LENGTH} caractères maximum)`)
  }
  if (input.photos.length > MAX_PHOTOS) {
    throw new Error(`${MAX_PHOTOS} photos au maximum par publication`)
  }

  // La RACINE : publier sur un avenant scinderait le fil en deux a la premiere
  // version 2, et le client verrait deux chantiers la ou il n'y en a qu'un.
  const root = await rootQuoteId(input.quoteId)

  const [owned] = await db
    .select({ id: quote.id, signedAt: quote.signedAt })
    .from(quote)
    .where(and(eq(quote.id, root), eq(quote.companyId, input.companyId)))

  if (!owned) throw new Error('Devis introuvable')
  if (!owned.signedAt) throw new Error('Ce devis n’est pas signé')

  const [post] = await db
    .insert(chantierPost)
    .values({ quoteId: root, companyId: input.companyId, body })
    .returning()

  const storage = createServiceSupabase()

  for (const [index, photo] of input.photos.entries()) {
    const path = `${input.companyId}/${post.id}/${index}`
    const { error } = await storage.storage
      .from('chantier-photos')
      .upload(path, await photo.arrayBuffer(), { contentType: photo.type })

    if (error) throw new Error('Le dépôt de la photo a échoué')

    await db.insert(chantierPhoto).values({ postId: post.id, storagePath: path })
  }

  // Le journal porte le fait, jamais le texte : la publication est deja
  // immuable dans sa table, et l'y recopier n'ajouterait rien.
  await recordEvent({
    type: 'chantier.post_published',
    subjectType: 'quote',
    subjectId: root,
    companyId: input.companyId,
    actorType: 'company',
    payload: { photos: input.photos.length },
  })

  return post
}

/**
 * Les adresses signees des photos d'un dossier.
 *
 * **Jamais servies directement** : elles montrent l'interieur du logement de
 * quelqu'un. Duree courte, comme les attestations de M3.
 */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}

  const storage = createServiceSupabase()
  const { data } = await storage.storage
    .from('chantier-photos')
    .createSignedUrls(paths, SIGNED_URL_SECONDS)

  return Object.fromEntries(
    (data ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path!, entry.signedUrl]),
  )
}
