import { describe, it, expect, beforeAll } from 'vitest'
import { logoUploadError, logoExtension, logoPublicUrl } from '@/domain/logo'

/** Un `File` factice de taille et type donnes, sans lire d'octets reels. */
function fakeFile(bytes: number, type: string): File {
  return { size: bytes, type } as File
}

describe('logoUploadError', () => {
  it('accepte un PNG sous la limite', () => {
    expect(logoUploadError(fakeFile(1000, 'image/png'))).toBeNull()
  })

  it('refuse un fichier vide', () => {
    expect(logoUploadError(fakeFile(0, 'image/png'))).toBe('Le fichier est vide')
  })

  it('refuse un type non autorise', () => {
    expect(logoUploadError(fakeFile(1000, 'image/svg+xml'))).toBe(
      'Formats acceptés : PNG, JPEG, WebP',
    )
  })

  it('refuse au-dela de 1 Mo', () => {
    expect(logoUploadError(fakeFile(1048577, 'image/png'))).toBe(
      'Le logo dépasse 1 Mo',
    )
  })
})

describe('logoExtension', () => {
  it('mappe chaque type accepte', () => {
    expect(logoExtension('image/png')).toBe('png')
    expect(logoExtension('image/jpeg')).toBe('jpg')
    expect(logoExtension('image/webp')).toBe('webp')
  })
})

describe('logoPublicUrl', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ref.supabase.co'
  })

  it('rend null sans chemin', () => {
    expect(logoPublicUrl(null)).toBeNull()
  })

  it("construit l'URL publique du bucket", () => {
    expect(logoPublicUrl('abc/171.png')).toBe(
      'https://ref.supabase.co/storage/v1/object/public/company-logos/abc/171.png',
    )
  })
})
