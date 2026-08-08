import { roles } from '@/ui/tokens'

/**
 * Le pont entre les tokens et `@react-pdf/renderer`.
 *
 * Un PDF n'a pas de mode sombre : il utilise toujours les roles `light`. Il n'a
 * pas non plus de terre cuite — un aplat de couleur boit l'encre, et une
 * photocopie le rend gris. Le document est donc monochrome par construction, et
 * seul le sceau y apparait, en une seule encre.
 *
 * `tests/ui/pdf-tokens.test.ts` verifie qu'aucune couleur n'est ecrite en dur
 * dans le rendu du devis : sans ce test, le PDF derive de l'interface au premier
 * ajustement, et c'est le PDF que le client conserve.
 */
export const pdf = {
  ink: roles.light.ink,
  soft: roles.light['ink-soft'],
  muted: roles.light['ink-muted'],
  rule: roles.light.rule,
  field: roles.light.field,
  paper: roles.light.raised,
} as const

/**
 * Les familles enregistrees par `registerBrandFonts`.
 *
 * Deux seulement, comme dans l'interface : Archivo porte tout ce qui est gras,
 * Inter porte le corps. Consequence pratique, et heureuse : le PDF n'a besoin
 * d'aucune graisse intermediaire d'Inter, donc la police variable suffit et il
 * n'y a pas de fichier statique introuvable a chasser.
 */
export const pdfFont = {
  body: 'Inter',
  display: 'Archivo',
} as const
