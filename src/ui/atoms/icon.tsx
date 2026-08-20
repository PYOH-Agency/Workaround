import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Clock,
  Copy,
  FileText,
  Hammer,
  KeyRound,
  Moon,
  Phone,
  Plus,
  Search,
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
  copy: Copy,
  document: FileText,
  /**
   * « Revoir les explications », et rien d'autre.
   *
   * Aucun des seize glyphes precedents ne disait « explication » : `alert`
   * previent, `search` cherche, `document` designe une piece. Le point
   * d'interrogation cercle est la convention, et une commande de compte sans
   * glyphe serait un bouton vide sous `lg`, ou son libelle se replie.
   */
  help: CircleHelp,
  moon: Moon,
  next: ChevronRight,
  phone: Phone,
  plus: Plus,
  search: Search,
  send: Send,
  sun: Sun,
  trash: Trash2,
  /**
   * Les deux roles de l'equipe.
   *
   * `Badge` exige un picto parce que la couleur ne doit jamais porter seule
   * l'information — mais l'ecran d'equipe donnait le MEME picto aux deux roles,
   * ce qui revenait a ne rien distinguer du tout. La cle ouvre, le marteau
   * travaille : le vocabulaire est celui du metier, et les deux glyphes se
   * separent encore a 16 px.
   */
  key: KeyRound,
  hammer: Hammer,
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
