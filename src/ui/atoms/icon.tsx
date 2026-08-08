import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Moon,
  Plus,
  Send,
  Sun,
  Trash2,
  X,
} from 'lucide-react'

/**
 * Le seul pictogramme du produit.
 *
 * Un composant unique plutot que douze exports nommes : c'est ce que prevoit
 * l'inventaire, et ca ne coute rien en poids puisque les douze glyphes vivent
 * de toute facon dans le meme module, donc dans le meme paquet.
 *
 * Le trait de 1,75 est accorde a la graisse d'Inter 500 — ni le 1,5 qui
 * s'efface a l'impression, ni le 2 qui ecrase le texte. Trois tailles, pas
 * une de plus.
 */

const GLYPHS = {
  alert: AlertTriangle,
  back: ArrowLeft,
  check: Check,
  clock: Clock,
  close: X,
  document: FileText,
  moon: Moon,
  next: ChevronRight,
  plus: Plus,
  send: Send,
  sun: Sun,
  trash: Trash2,
} as const

const SIZES = { sm: 16, md: 20, lg: 24 } as const

export type IconName = keyof typeof GLYPHS

export function Icon({
  name,
  size = 'md',
}: {
  name: IconName
  size?: keyof typeof SIZES
}) {
  const Glyph = GLYPHS[name]
  return <Glyph size={SIZES[size]} strokeWidth={1.75} aria-hidden="true" />
}
