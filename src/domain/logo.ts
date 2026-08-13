/**
 * Le logo d'une entreprise : ce qui est pur autour de lui.
 *
 * La validation et la derivation d'URL vivent ici, hors du service, pour se
 * verifier sans base ni stockage. Le service `company-logo` s'appuie dessus.
 */

/** Le compartiment de stockage. PUBLIC : le logo est fait pour etre vu. */
export const LOGO_BUCKET = 'company-logos'

/** 1 Mo. La meme limite est posee sur le bucket. */
export const LOGO_MAX_BYTES = 1024 * 1024

/** Les seuls types acceptes. Pas de SVG : un SVG peut embarquer du script. */
export const LOGO_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const

type LogoMime = (typeof LOGO_MIME)[number]

/** Le message d'erreur si le fichier ne convient pas, ou `null`. */
export function logoUploadError(file: File): string | null {
  if (file.size === 0) return 'Le fichier est vide'
  if (!LOGO_MIME.includes(file.type as LogoMime)) return 'Formats acceptés : PNG, JPEG, WebP'
  if (file.size > LOGO_MAX_BYTES) return 'Le logo dépasse 1 Mo'
  return null
}

/** L'extension de fichier pour un type accepte. */
export function logoExtension(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
}

/**
 * L'URL publique d'un logo, ou `null`.
 *
 * Deterministe : un bucket public sert ses objets a une adresse fixe, sans
 * signature ni requete. On la construit donc plutot que d'instancier un client.
 */
export function logoPublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${base}/storage/v1/object/public/${LOGO_BUCKET}/${path}`
}
