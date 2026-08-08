import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, event } from '@/db/schema'
import { uploadCertificate, CERTIFICATE_BUCKET } from '@/services/certificates'

const COMPANY = randomUUID()

const pdf = () => {
  const bytes = readFileSync('tests/e2e/fixtures/attestation.pdf')
  return new File([new Uint8Array(bytes)], 'attestation.pdf', { type: 'application/pdf' })
}

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
    legalName: 'Entreprise de test',
  })
})

afterAll(async () => {
  await connection.end()
})

describe('depot d une attestation', () => {
  it('arrive en attente de revue, jamais validee d office', async () => {
    // Rien n'est extrait au depot : l'attestation attend une revue humaine.
    // C'est la correspondance libelle -> activite qui engage, et elle ne se
    // deduit pas.
    const created = await uploadCertificate({ companyId: COMPANY, kind: 'decennale', file: pdf() })

    expect(created.status).toBe('pending')
    expect(created.validUntil).toBeNull()
    expect(created.storagePath).toContain(COMPANY)
  }, 30_000)

  it("n'est pas accessible publiquement", async () => {
    // Une attestation porte le numero de police et l'identite de l'assure.
    const created = await uploadCertificate({ companyId: COMPANY, kind: 'rc_pro', file: pdf() })

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CERTIFICATE_BUCKET}/${created.storagePath}`
    const response = await fetch(url)

    expect(response.ok).toBe(false)
  }, 30_000)

  it('journalise le depot', async () => {
    const created = await uploadCertificate({ companyId: COMPANY, kind: 'decennale', file: pdf() })

    const rows = await db.select().from(event).where(eq(event.subjectId, created.id))
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('certificate.uploaded')
  }, 30_000)

  it('refuse un fichier qui n est pas un PDF', async () => {
    const notPdf = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })

    await expect(
      uploadCertificate({ companyId: COMPANY, kind: 'decennale', file: notPdf }),
    ).rejects.toThrow('PDF')
  })

  it('refuse un fichier vide', async () => {
    const empty = new File([], 'vide.pdf', { type: 'application/pdf' })

    await expect(
      uploadCertificate({ companyId: COMPANY, kind: 'decennale', file: empty }),
    ).rejects.toThrow('vide')
  })
})
