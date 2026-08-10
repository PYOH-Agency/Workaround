import { Badge } from '@/ui/atoms/badge'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Notice } from '@/ui/molecules/notice'
import { PageHeader } from '@/ui/molecules/page-header'
import { Rail, RailItem } from '@/ui/molecules/rail'
import { DataTable } from '@/ui/organisms/data-table'
import { Section } from './Section'

/**
 * Les quatre entrees de la reprise des treize ecrans.
 *
 * Dans leur propre fichier : `page.tsx` frole les 250 lignes, et une vitrine
 * qu'on n'ose plus completer cesse d'etre la reference partagee qu'elle
 * pretend etre.
 */
export function StructureBlocks() {
  return (
    <>
      <Section title="En-tête d’écran">
        <PageHeader
          back={{ href: '/design-system', label: 'Retour au devis DEV-2026-0184' }}
          title="Situation de travaux"
          subtitle="Mme Ravel · avancement déclaré en cumulé"
          actions={
            <Badge tone="neutral" icon={<Icon name="document" size="sm" />}>
              3ᵉ situation
            </Badge>
          }
        />
        <Text size="sm" tone="muted">
          Le retour est en haut, où on le cherche : en bas de page, il n’est lu que par qui a
          déjà fini. Son libellé nomme la destination.
        </Text>
      </Section>

      <Section title="Encarts">
        <div className="flex flex-col gap-3">
          <Notice tone="danger" alert>
            Cette situation ne peut pas être établie : un avancement se déclare entre 0 et 100 %.
          </Notice>
          <Notice tone="warning">
            Vous avez ajouté ces entreprises vous-même.{' '}
            <strong>Nous ne les avons pas vérifiées.</strong>
          </Notice>
          <Notice tone="verified">
            Votre client a déclaré la réception des travaux au <strong>4 août 2026</strong>.
          </Notice>
        </div>
        <Text size="sm" tone="muted">
          Seul le premier porte <code>role=&quot;alert&quot;</code> : il vient de survenir. Le
          poser sur une mise en garde permanente ferait parler le lecteur d’écran à chaque rendu.
        </Text>
      </Section>

      <Section title="La règle — une suite">
        <Rail>
          <RailItem>
            <Text size="sm" tone="muted" as="span">
              2 juillet
            </Text>
            <Text as="span"> · Devis signé</Text>
          </RailItem>
          <RailItem>
            <Text size="sm" tone="muted" as="span">
              12 juillet
            </Text>
            <Text as="span"> · Paiement reçu</Text>
          </RailItem>
          <RailItem current>
            <Text size="sm" tone="muted" as="span">
              4 août
            </Text>
            <Text as="span"> · Zinguerie posée côté rue</Text>
          </RailItem>
        </Rail>
        <Text size="sm" tone="muted">
          Le carré vient de la marque : celui de l’angle droit de l’équerre. Terre cuite et plus
          gros pour l’élément courant — la taille double la couleur.
        </Text>
      </Section>

      <Section title="Le tableau — une comparaison">
        <DataTable
          caption="Exemple de tableau de comparaison"
          columns={[
            { label: 'Entreprise' },
            { label: 'Assurance aujourd’hui' },
            { label: 'Action', hideLabel: true, align: 'right' },
          ]}
          rows={[
            {
              id: '1',
              cells: [
                <Text key="a" as="span">
                  Toiture Marchand
                </Text>,
                <Badge key="b" tone="verified" icon={<Icon name="check" size="sm" />}>
                  Assurée pour couverture
                </Badge>,
                <Link key="c" href="/design-system">
                  Recontacter
                </Link>,
              ],
            },
            {
              id: '2',
              cells: [
                <Text key="a" as="span">
                  Élec Garonne
                </Text>,
                <Badge key="b" tone="danger" icon={<Icon name="alert" size="sm" />}>
                  Attestation expirée
                </Badge>,
                <Link key="c" href="/design-system">
                  Recontacter
                </Link>,
              ],
            },
          ]}
        />
      </Section>
    </>
  )
}
