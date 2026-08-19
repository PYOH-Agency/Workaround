import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { roles } from '@/ui/tokens'

export const alt = 'Le carnet de votre logement, tenu tout seul — D’équerre'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * L'image de partage, generee par code.
 *
 * Elle lit les tokens et les fichiers de police du depot — `src/pdf/fonts` est
 * le seul endroit ou vivent des TTF, le rendu PDF n'etant pas seul a en avoir
 * besoin. Une image generee ne peut pas diverger de la charte ; une image
 * dessinee a la main, si.
 *
 * **Deux polices, comme sur l'ecran.** Le titre est en Bricolage — l'instance
 * statique `opsz 48 / wdth 92 / wght 800`, exactement le reglage que `Heading`
 * applique a l'accroche —, et le logotype reste en Archivo. Satori n'applique
 * pas les axes d'une police variable : lui donner le fichier variable aurait
 * rendu l'instance par defaut, c'est-a-dire un romain maigre a la place d'un
 * gras resserre. D'ou l'instance figee, et non le fichier variable.
 */
export default async function Image() {
  const fonts = join(process.cwd(), 'src', 'pdf', 'fonts')
  const archivo = readFileSync(join(fonts, 'Archivo-ExtraBold.ttf'))
  const bricolage = readFileSync(join(fonts, 'BricolageGrotesque-ExtraBold-SemiCondensed.ttf'))

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
          fontFamily: 'Bricolage',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
          <svg width="64" height="64" viewBox="0 0 48 48">
            <path d="M8 4 H19 V29 H8 Z" fill={roles.light.ink} />
            <path d="M8 29 H44 V40 H8 Z" fill={roles.light.brand} />
            <rect x="19" y="22" width="7" height="7" fill={roles.light.ink} />
          </svg>
          <span style={{ fontSize: 44, letterSpacing: -2, fontFamily: 'Archivo' }}>
            d’équerre
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 72,
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          <span>Le carnet de votre logement,</span>
          <span>tenu tout seul.</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Bricolage', data: bricolage, weight: 800, style: 'normal' },
        { name: 'Archivo', data: archivo, weight: 800, style: 'normal' },
      ],
    },
  )
}
