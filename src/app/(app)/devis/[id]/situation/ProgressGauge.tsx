import { lineValue } from '@/domain/situation'
import type { Cents } from '@/domain/money'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { cn } from '@/ui/cn'

/** Les graduations : un quart, la moitie, trois quarts. */
const TICKS = [25, 50, 75]

/**
 * La latte graduee d'une ligne de situation.
 *
 * L'ecran portait un paragraphe pour expliquer que l'avancement se declare en
 * **cumule** et non en delta. Un paragraphe qui explique une regle est le signe
 * qu'un dessin la dirait mieux : le segment sombre est acquis et ne peut pas
 * etre repris, le segment terre cuite est ce qu'on ajoute aujourd'hui. Saisir
 * 35 en croyant ajouter 35 % quand la ligne est deja a 40 devient visible avant
 * d'etre soumis.
 *
 * Les graduations au quart ne sont pas decoratives : un quart, la moitie, trois
 * quarts, c'est ainsi qu'un avancement se parle sur un chantier.
 *
 * Reste aupres de son ecran : un seul lecteur, comme `SituationForm`. Le design
 * system n'accueille que ce que deux ecrans doivent lire a l'identique.
 *
 * Le montant ajoute passe par `lineValue`, la fonction du domaine qui porte la
 * regle d'arrondi. Le recalculer ici ferait diverger le dessin de la facture.
 */
export function ProgressGauge({
  totalExclTax,
  previousPercent,
  percent,
}: {
  totalExclTax: Cents
  /** Ce que les situations precedentes ont deja facture sur cette ligne. */
  previousPercent: number
  /** L'avancement cumule declare a l'instant. */
  percent: number
}) {
  // Borne parce que le champ est libre : `Number('abc')` donne NaN, et « 250 »
  // dessinerait une barre qui sort de sa piste.
  const declared = Math.min(Math.max(Number.isFinite(percent) ? percent : 0, 0), 100)
  const added = Math.max(declared - previousPercent, 0)
  const receding = declared < previousPercent

  const addedCents = lineValue(totalExclTax, declared) - lineValue(totalExclTax, previousPercent)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-3.5 overflow-hidden rounded-badge border border-rule bg-raised">
        <span className="bg-ink-soft" style={{ width: `${previousPercent}%` }} />
        <span className="bg-brand" style={{ width: `${added}%` }} />
        {TICKS.map((tick) => (
          <span
            key={tick}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-rule"
            style={{ left: `${tick}%` }}
          />
        ))}
      </div>

      {/*
        La legende double le dessin en mots : la barre seule serait une
        information portee par la couleur, ce que le socle interdit.
      */}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        {previousPercent > 0 && <Key tone="done">Déjà facturé {previousPercent} %</Key>}

        {added > 0 && (
          <Key tone="added">
            Cette situation +{added} % · <Money cents={addedCents} />
          </Key>
        )}

        {declared < 100 && !receding && <Key tone="left">Reste {100 - declared} %</Key>}

        {receding && (
          <Text size="sm" tone="muted" as="span">
            En deçà des {previousPercent} % déjà facturés.
          </Text>
        )}

        {declared === 0 && previousPercent === 0 && (
          <Text size="sm" tone="muted" as="span">
            Rien de déclaré à ce jour.
          </Text>
        )}
      </div>
    </div>
  )
}

const SWATCHES = {
  done: 'bg-ink-soft',
  added: 'bg-brand',
  left: 'border border-rule bg-raised',
} as const

function Key({ tone, children }: { tone: keyof typeof SWATCHES; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span aria-hidden="true" className={cn('block size-2.5 rounded-badge', SWATCHES[tone])} />
      {children}
    </span>
  )
}
