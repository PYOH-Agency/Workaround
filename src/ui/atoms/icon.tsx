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
 * Les seuls pictogrammes du produit.
 *
 * Passer par ce fichier plutot que d'importer Lucide partout impose le trait de
 * 1,75 px et les trois tailles, et rend l'inventaire visible : on voit d'un coup
 * d'oeil si un ecran introduit un picto de plus.
 *
 * Le trait de 1,75 est accorde a la graisse d'Inter 500 — ni le 1,5 qui s'efface
 * a l'impression, ni le 2 qui ecrase le texte.
 */

const SIZES = { sm: 16, md: 20, lg: 24 } as const

type IconProps = { size?: keyof typeof SIZES }

function make(Glyph: typeof Check) {
  return function Icon({ size = 'md' }: IconProps) {
    return <Glyph size={SIZES[size]} strokeWidth={1.75} aria-hidden="true" />
  }
}

export const IconCheck = make(Check)
export const IconClock = make(Clock)
export const IconAlert = make(AlertTriangle)
export const IconClose = make(X)
export const IconPlus = make(Plus)
export const IconSend = make(Send)
export const IconTrash = make(Trash2)
export const IconBack = make(ArrowLeft)
export const IconNext = make(ChevronRight)
export const IconDocument = make(FileText)
export const IconSun = make(Sun)
export const IconMoon = make(Moon)
