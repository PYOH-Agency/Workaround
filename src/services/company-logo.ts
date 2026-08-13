import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { LOGO_BUCKET, logoExtension, logoUploadError } from '@/domain/logo'
import { createServiceSupabase } from '@/lib/supabase-server'
import { recordEvent } from '@/services/events'

/**
 * Depose (ou remplace) le logo d'une entreprise.
 *
 * Le compartiment est PUBLIC : le logo est fait pour etre vu sur la page
 * publique. On ecrit une cle HORODATEE — `{id}/{ts}.{ext}` — et on supprime
 * l'ancienne : sur un bucket public servi par un CDN, reutiliser la meme cle
 * ferait servir l'ancienne image apres un remplacement.
 */
export async function saveCompanyLogo(input: { companyId: string; file: File }): Promise<void> {
  const error = logoUploadError(input.file)
  if (error) throw new Error(error)

  const [current] = await db
    .select({ logoPath: company.logoPath })
    .from(company)
    .where(eq(company.id, input.companyId))

  const supabase = createServiceSupabase()
  const path = `${input.companyId}/${Date.now()}.${logoExtension(input.file.type)}`

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, await input.file.arrayBuffer(), { contentType: input.file.type })

  // La cause est conservee : un message generique rend une panne de stockage
  // indiagnosticable.
  if (uploadError) throw new Error('Le dépôt du logo a échoué', { cause: uploadError })

  await db.update(company).set({ logoPath: path }).where(eq(company.id, input.companyId))

  // On efface l'ancien objet APRES coup : si la suppression echoue, la fiche
  // pointe deja sur le nouveau, et il ne reste qu'un objet orphelin sans effet.
  if (current?.logoPath) {
    await supabase.storage.from(LOGO_BUCKET).remove([current.logoPath])
  }

  await recordEvent({
    type: 'company.logo_updated',
    subjectType: 'company',
    subjectId: input.companyId,
    companyId: input.companyId,
    actorType: 'company',
    payload: { set: true },
  })
}

/** Retire le logo : remet `logoPath` a `null` et supprime l'objet. */
export async function removeCompanyLogo(companyId: string): Promise<void> {
  const [current] = await db
    .select({ logoPath: company.logoPath })
    .from(company)
    .where(eq(company.id, companyId))

  if (!current?.logoPath) return

  await db.update(company).set({ logoPath: null }).where(eq(company.id, companyId))

  // La fiche ne pointe plus sur rien des la mise a jour ci-dessus : l'effacement
  // du fichier est un menage, pas la garantie du retrait. S'il echoue, il reste
  // un objet orphelin — deja public avant, donc sans divulgation nouvelle — que
  // plus aucune ligne ne reference.
  const supabase = createServiceSupabase()
  await supabase.storage.from(LOGO_BUCKET).remove([current.logoPath])

  await recordEvent({
    type: 'company.logo_updated',
    subjectType: 'company',
    subjectId: companyId,
    companyId,
    actorType: 'company',
    payload: { set: false },
  })
}
