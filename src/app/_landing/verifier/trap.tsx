import { Badge } from '@/ui/atoms/badge'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { SectionHeader } from '@/ui/molecules/section-header'
import { InkBand } from '../ink-band'

/**
 * Le piege, sur l'encre.
 *
 * C'est la section qui pose le probleme : elle prend la premiere des deux
 * bandes d'encre de la page, comme « ce que ça vous évite » cote pro. Le
 * pendant clair — ce qu'on garde — prend la seconde, en fin de page.
 *
 * Les trois verdicts ne sont plus des cartes : `Card` porte un fond de craie,
 * et trois rectangles clairs poses sur l'encre en auraient fait le sujet de la
 * bande. Trois colonnes separees par un filet suffisent, et la pastille de
 * statut — dont le fond teinte est deja un jeton verifie — porte a elle seule
 * la couleur.
 */
export function Trap() {
  /*
    La date d'echeance de la carte « Verifiee » etait figee en dur au 08 aout
    2026 — deja passee des le 12. Une illustration de la fraicheur qui paraissait
    perimee. On la calcule a un an de la date du rendu : toujours a venir, et
    remise a jour a chaque build. C'est un exemple, pas une donnee reelle.
  */
  const checkedUntil = new Date()
  checkedUntil.setFullYear(checkedUntil.getFullYear() + 1)
  const checkedUntilLabel = checkedUntil.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const verdicts = [
    {
      badge: (
        <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
          Couverte
        </Badge>
      ),
      title: 'Plomberie',
      body: 'Nommée sur l’attestation, en cours de validité.',
    },
    {
      badge: (
        <Badge tone="warning" icon={<Icon name="alert" size="sm" />}>
          Non couverte
        </Badge>
      ),
      title: 'Électricité',
      body: 'Absente de l’attestation. En cas de sinistre, aucun recours.',
    },
    {
      badge: (
        <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
          Vérifiée
        </Badge>
      ),
      title: checkedUntilLabel,
      body: 'Recontrôlée à chaque échéance, automatiquement.',
    },
  ]

  return (
    <InkBand>
      <SectionHeader
        tone="inverse"
        label="Le piège"
        title="Assuré ne veut pas dire assuré pour tout."
        lead="C’est le premier motif de refus d’indemnisation du secteur. L’attestation liste des activités précises ; les travaux qui n’y figurent pas ne sont pas couverts, même si l’entreprise est parfaitement en règle par ailleurs."
      />

      <div className="grid w-full gap-8 border-t border-primary-rule pt-8 sm:grid-cols-3 sm:gap-10">
        {verdicts.map(({ badge, title, body }) => (
          <div key={title} className="flex flex-col items-start gap-3">
            {badge}
            <Heading level={3} tone="inverse">
              {title}
            </Heading>
            <Text size="sm" tone="inverse-soft">
              {body}
            </Text>
          </div>
        ))}
      </div>
    </InkBand>
  )
}
