import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { insuranceCertificate } from '@/db/schema'
import { createServiceSupabase } from '@/lib/supabase-server'
import { recordEvent } from '@/services/events'
import type { InsuranceKind } from '@/domain/activity'

export const CERTIFICATE_BUCKET = 'certificates'

const MAX_BYTES = 10 * 1024 * 1024

export interface UploadCertificate {
  companyId: string
  kind: InsuranceKind
  file: File
}

/**
 * Depose une attestation.
 *
 * Le fichier va dans un compartiment PRIVE : une attestation porte le numero de
 * police et l'identite de l'assure. Rien n'est extrait ici — l'attestation
 * arrive au statut `pending` et attend une revue humaine.
 *
 * C'est delibere : si un humain valide chaque attestation au demarrage,
 * l'extraction automatique n'est pas un mecanisme de justesse, c'est un
 * accelerateur de saisie. On construit d'abord ce qui doit exister.
 */
export async function uploadCertificate(input: UploadCertificate) {
  if (input.file.size === 0) throw new Error('Le fichier est vide')
  if (input.file.size > MAX_BYTES) throw new Error('Le fichier dépasse 10 Mo')
  if (input.file.type !== 'application/pdf') throw new Error('Seuls les PDF sont acceptés')

  const path = `${input.companyId}/${randomUUID()}.pdf`
  const supabase = createServiceSupabase()

  const { error } = await supabase.storage
    .from(CERTIFICATE_BUCKET)
    .upload(path, await input.file.arrayBuffer(), { contentType: 'application/pdf' })

  // La cause est conservee : un message generique rend toute panne de stockage
  // indiagnosticable, et c'est exactement ce qui a coute une heure en M2.
  if (error) throw new Error("Le dépôt de l'attestation a échoué", { cause: error })

  const [created] = await db
    .insert(insuranceCertificate)
    .values({ companyId: input.companyId, kind: input.kind, storagePath: path })
    .returning()

  await recordEvent({
    type: 'certificate.uploaded',
    subjectType: 'certificate',
    subjectId: created.id,
    companyId: input.companyId,
    actorType: 'company',
    payload: { kind: input.kind },
  })

  return created
}

/** Toutes les attestations d'une entreprise, la plus recente d'abord. */
export async function companyCertificates(companyId: string) {
  return db.query.insuranceCertificate.findMany({
    where: eq(insuranceCertificate.companyId, companyId),
    with: { activities: { with: { activity: true } } },
    orderBy: desc(insuranceCertificate.uploadedAt),
  })
}

/** Attestations validees, avec les activites qu'elles couvrent. */
export async function validatedCertificates(companyId: string) {
  return db.query.insuranceCertificate.findMany({
    where: and(
      eq(insuranceCertificate.companyId, companyId),
      eq(insuranceCertificate.status, 'validated'),
    ),
    with: { activities: true },
    orderBy: desc(insuranceCertificate.validUntil),
  })
}
