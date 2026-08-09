import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { roles } from '@/ui/tokens'

export const alt = 'Votre artisan est-il assuré pour ce qu’il va faire ? — D’équerre'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * L'image de partage de la page demandeur, generee par code.
 *
 * Meme principe que l'image de la page pro (`src/app/opengraph-image.tsx`) :
 * elle lit les tokens et les fichiers de police deja embarques pour le PDF.
 */
export default async function Image() {
  const fonts = join(process.cwd(), 'src', 'pdf', 'fonts')
  const archivo = readFileSync(join(fonts, 'Archivo-ExtraBold.ttf'))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 84,
          background: roles.light.surface,
          color: roles.light.ink,
          fontFamily: 'Archivo',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
          <svg width="64" height="64" viewBox="0 0 48 48">
            <path d="M8 4 H19 V29 H8 Z" fill={roles.light.ink} />
            <path d="M8 29 H44 V40 H8 Z" fill={roles.light.brand} />
            <rect x="19" y="22" width="7" height="7" fill={roles.light.ink} />
          </svg>
          <span style={{ fontSize: 44, letterSpacing: -2 }}>d’équerre</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 62,
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          <span>Votre artisan est-il assuré</span>
          <span>pour ce qu’il va faire ?</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Archivo', data: archivo, weight: 800, style: 'normal' }] },
  )
}
