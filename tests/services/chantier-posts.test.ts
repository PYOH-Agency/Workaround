import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { chantierPhoto, quote } from '@/db/schema'
import {
  MAX_PHOTOS,
  MAX_POST_LENGTH,
  publishPost,
  signedPhotoUrls,
} from '@/services/chantier-posts'
import { lateChantier } from './dispute-fixtures'

afterAll(async () => {
  await connection.end()
})

const photo = () => new File([new Uint8Array([1, 2, 3])], 'p.jpg', { type: 'image/jpeg' })

describe('publier au fil', () => {
  it('publie un message', async () => {
    const { companyId, quoteId } = await lateChantier()

    const post = await publishPost({ companyId, quoteId, body: 'Dépose faite.', photos: [] })

    expect(post.body).toBe('Dépose faite.')
    expect(post.quoteId).toBe(quoteId)
  })

  it('refuse un message vide', async () => {
    const { companyId, quoteId } = await lateChantier()

    await expect(publishPost({ companyId, quoteId, body: '  ', photos: [] })).rejects.toThrow(
      /vide/,
    )
  })

  it('refuse un message trop long', async () => {
    const { companyId, quoteId } = await lateChantier()

    await expect(
      publishPost({ companyId, quoteId, body: 'a'.repeat(MAX_POST_LENGTH + 1), photos: [] }),
    ).rejects.toThrow(/trop long/)
  })

  it('refuse plus de quatre photos', async () => {
    // Sans borne, le fil devient un album — c'est-a-dire un autre produit.
    const { companyId, quoteId } = await lateChantier()

    await expect(
      publishPost({
        companyId,
        quoteId,
        body: 'Cinq.',
        photos: Array.from({ length: MAX_PHOTOS + 1 }, photo),
      }),
    ).rejects.toThrow(/photos au maximum/)
  })

  it('refuse le chantier d une AUTRE entreprise', async () => {
    const { quoteId } = await lateChantier()
    const rival = await lateChantier()

    await expect(
      publishPost({ companyId: rival.companyId, quoteId, body: 'Texte.', photos: [] }),
    ).rejects.toThrow(/introuvable/)
  })

  it('attache la publication a la RACINE de la chaine', async () => {
    // Publier sur un avenant scinderait le fil en deux a la premiere version 2,
    // et le client verrait deux chantiers la ou il n'y en a qu'un.
    const { companyId, quoteId } = await lateChantier()
    const [source] = await db.select().from(quote).where(eq(quote.id, quoteId))

    const [amendment] = await db
      .insert(quote)
      .values({
        projectId: source.projectId,
        companyId,
        number: source.number,
        version: 2,
        status: 'signed',
        publicToken: randomUUID(),
        supersedesQuoteId: quoteId,
        signedAt: new Date(),
      })
      .returning()

    const post = await publishPost({
      companyId,
      quoteId: amendment.id,
      body: 'Suite.',
      photos: [],
    })

    expect(post.quoteId).toBe(quoteId)
  })
})

describe('les photos', () => {
  it('se deposent et ne sont servies que par une adresse signee', async () => {
    const { companyId, quoteId } = await lateChantier()

    const post = await publishPost({ companyId, quoteId, body: 'Voilà.', photos: [photo()] })

    const [stored] = await db
      .select()
      .from(chantierPhoto)
      .where(eq(chantierPhoto.postId, post.id))
    expect(stored.storagePath).toBe(`${companyId}/${post.id}/0`)

    const urls = await signedPhotoUrls([stored.storagePath])
    // Une adresse signee porte son jeton : sans lui, le depot prive refuserait.
    expect(urls[stored.storagePath]).toMatch(/token=/)
  })

  it('rend un ensemble vide sans photo, sans appeler le depot', async () => {
    expect(await signedPhotoUrls([])).toEqual({})
  })
})
