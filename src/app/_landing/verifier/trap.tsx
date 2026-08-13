import { Badge } from '@/ui/atoms/badge'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { SectionHeader } from '@/ui/molecules/section-header'
import { Stagger } from '@/ui/molecules/stagger'

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

  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-6">
          <SectionHeader
            label="Le piège"
            title="Assuré ne veut pas dire assuré pour tout."
            lead="C’est le premier motif de refus d’indemnisation du secteur. L’attestation liste des activités précises ; les travaux qui n’y figurent pas ne sont pas couverts, même si l’entreprise est parfaitement en règle par ailleurs."
          />
          <Stagger cols={3}>
            <Card>
              <div className="flex flex-col gap-3">
                <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
                  Couverte
                </Badge>
                <Heading level={3}>Plomberie</Heading>
                <Text size="sm" tone="soft">
                  Nommée sur l’attestation, en cours de validité.
                </Text>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col gap-3">
                <Badge tone="warning" icon={<Icon name="alert" size="sm" />}>
                  Non couverte
                </Badge>
                <Heading level={3}>Électricité</Heading>
                <Text size="sm" tone="soft">
                  Absente de l’attestation. En cas de sinistre, aucun recours.
                </Text>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col gap-3">
                <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
                  Vérifiée
                </Badge>
                <Heading level={3}>{checkedUntilLabel}</Heading>
                <Text size="sm" tone="soft">
                  Recontrôlée à chaque échéance, automatiquement.
                </Text>
              </div>
            </Card>
          </Stagger>
        </div>
      </div>
    </section>
  )
}
