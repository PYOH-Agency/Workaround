import type { Metadata } from 'next'
import { Badge } from '@/ui/atoms/badge'
import { Button } from '@/ui/atoms/button'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Money } from '@/ui/atoms/money'
import { Separator } from '@/ui/atoms/separator'
import { Spinner } from '@/ui/atoms/spinner'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { Mark } from '@/ui/brand/mark'
import { Seal } from '@/ui/brand/seal'
import { roles } from '@/ui/tokens'
import { FieldsAndCards } from './FieldsAndCards'
import { Section } from './Section'

/**
 * La vitrine du design system.
 *
 * `noindex` : le passeport public est un actif de referencement, cette page n'a
 * rien a y faire. Elle reste accessible en production a dessein — c'est la
 * reference partagee quand on discute d'un composant.
 */
export const metadata: Metadata = {
  title: "Design system — D'équerre",
  robots: { index: false, follow: false },
}

/* Pictogrammes minimaux : la famille Lucide arrive avec les organismes. */
const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)
const Clock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)
const Cross = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-6 py-16">
      <header className="flex flex-col gap-4">
        <Lockup size="lg" />
        <Text tone="soft">
          La référence partagée. Tous les composants, dans tous leurs états, dans le thème
          courant du système. Bascule le mode sombre de ton système d’exploitation pour
          vérifier les deux.
        </Text>
      </header>

      <Section title="La marque">
        <Row>
          <Mark size={64} />
          <Mark size={32} />
          <Mark size={24} />
          <Mark size={16} />
          <Text size="sm" tone="muted" as="span">
            64 · 32 · 24 · 16 — le carré de l’angle disparaît sous 24 px
          </Text>
        </Row>
        <Row>
          <Seal size={64} />
          <Seal size={32} />
          <Seal size={24} />
          <Seal size={16} />
          <Text size="sm" tone="muted" as="span">
            le sceau, qui s’appose au lieu de s’exprimer
          </Text>
        </Row>
        <Row>
          <span className="text-ink">
            <Mark size={40} tone="mono" />
          </span>
          <span className="text-danger">
            <Mark size={40} tone="mono" />
          </span>
          <Text size="sm" tone="muted" as="span">
            ton « mono » : suit currentColor, donc l’impression une encre
          </Text>
        </Row>
        <Row>
          <Lockup size="sm" />
          <Lockup size="md" />
          <Lockup orientation="vertical" size="sm" />
        </Row>
      </Section>

      <Section title="Les rôles de couleur">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(roles.light) as Array<keyof typeof roles.light>).map((name) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div
                className="h-12 rounded-control border border-rule"
                style={{ background: `var(--dq-${name})` }}
              />
              <span className="font-mono text-[10.5px] text-ink-muted">{name}</span>
            </div>
          ))}
        </div>
        <Text size="sm" tone="muted">
          Ces pastilles lisent les variables du thème : elles changent avec lui. C’est le
          seul endroit du produit où une couleur est posée en style inline.
        </Text>
      </Section>

      <Section title="Typographie">
        {/*
          `as="p"` sur les specimens : sans ca, la planche fabrique de faux
          titres et troue la hierarchie de la page — exactement le defaut que
          cette page est censee apprendre a eviter.
        */}
        <Heading level="display" as="p">
          Tout est d’équerre
        </Heading>
        <Heading level={1} as="p">
          Devis n° 2026-014
        </Heading>
        <Heading level={2} as="p">
          Détail des prestations
        </Heading>
        <Heading level={3} as="p">
          Ventilation de la TVA
        </Heading>
        <Text>Le solde est exigible à réception de la facture.</Text>
        <Text size="sm" tone="soft">
          Assurance décennale AXA n° 8842-117-C
        </Text>
        <Text size="label" tone="muted">
          Montant total TTC
        </Text>
        <Separator />
        <div className="flex flex-col gap-1">
          <Money cents={124000} />
          <Money cents={1890750} />
          <Money cents={11111} />
          <Money cents={1890750} emphasis="strong" />
        </div>
        <Text size="sm" tone="muted">
          Chiffres tabulaires : les virgules s’alignent en colonne. Actif sur tout le
          produit, jamais désactivé.
        </Text>
        <Row>
          <Text as="span" size="sm">
            <DateText value="2026-03-12" />
          </Text>
          <Text as="span" size="sm">
            <DateText value="2026-03-12" format="short" />
          </Text>
        </Row>
      </Section>

      <Section title="Boutons">
        <Row>
          <Button tone="primary">Émettre la facture</Button>
          <Button tone="secondary">Prévisualiser</Button>
          <Button tone="ghost">Annuler</Button>
          <Button tone="danger">Supprimer le devis</Button>
        </Row>
        <Row>
          <Button tone="conversion" size="lg">
            Signer le devis
          </Button>
          <Button tone="danger-solid">Émettre un avoir</Button>
        </Row>
        <Row>
          <Button pending>Envoi en cours</Button>
          <Button disabled>Indisponible</Button>
          <Button tone="secondary" disabled>
            Indisponible
          </Button>
        </Row>
        <Text size="sm" tone="muted">
          Le primaire est en encre, jamais en terre cuite : sur un écran de facturation, une
          action destructive est toujours à portée. La terre cuite est réservée à l’unique
          action de conversion des pages publiques.
        </Text>
      </Section>

      <Section title="Liens et statuts">
        <Row>
          <Link href="/devis">Lien interne</Link>
          <Link href="https://www.legifrance.gouv.fr">Lien sortant</Link>
        </Row>
        <Row>
          <Badge tone="verified" icon={<Check />}>
            Décennale à jour
          </Badge>
          <Badge tone="warning" icon={<Clock />}>
            Expire dans 24 jours
          </Badge>
          <Badge tone="danger" icon={<Cross />}>
            Attestation périmée
          </Badge>
          <Badge tone="neutral" icon={<Clock />}>
            Brouillon
          </Badge>
        </Row>
        <Text size="sm" tone="muted">
          Chaque pastille porte un pictogramme : le picto est requis par le type, donc la
          couleur ne peut pas porter seule l’information.
        </Text>
        <Row>
          <Spinner size={20} />
          <Text as="span" size="sm" tone="muted">
            immobile si le système demande de réduire les animations
          </Text>
        </Row>
      </Section>

      <FieldsAndCards />
    </main>
  )
}
