import { Button } from '@/ui/atoms/button'
import { Checkbox } from '@/ui/atoms/checkbox'
import { Heading } from '@/ui/atoms/heading'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { Section } from './Section'

/**
 * Les sections « Champs » et « Cartes » de la vitrine.
 *
 * Deportees pour tenir sous la limite de taille de fichier : la vitrine grandit
 * a chaque composant livre, et la decouper par famille est la seule facon de ne
 * pas y revenir tous les trois ajouts.
 */
export function FieldsAndCards() {
  return (
    <>
      <Section title="Champs">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Forme juridique" required>
            {(p) => <Input {...p} name="legal_form_label" defaultValue="EI" />}
          </Field>

          <Field
            label="Numéro d’immatriculation"
            help="RCS ou Répertoire des métiers, avec la ville."
            required
          >
            {(p) => <Input {...p} name="registration_number" placeholder="RCS Bordeaux 507 698 207" />}
          </Field>

          <Field
            label="Numéro de TVA intracommunautaire"
            error="Le numéro doit commencer par FR suivi de 11 chiffres."
          >
            {(p) => <Input {...p} name="vat_number" defaultValue="FR12" />}
          </Field>

          <Field label="Taux de TVA" help="Le taux appliqué par défaut aux nouvelles lignes.">
            {(p) => (
              <Select {...p} name="vat_rate" defaultValue="2000">
                <option value="2000">20 %</option>
                <option value="1000">10 %</option>
                <option value="550">5,5 %</option>
              </Select>
            )}
          </Field>

          <div className="sm:col-span-2">
            <Field label="Conditions de paiement" help="Reprises telles quelles sur le devis.">
              {(p) => (
                <Textarea
                  {...p}
                  name="payment_terms"
                  defaultValue="Acompte de 30 % à la commande, solde à la réception des travaux."
                />
              )}
            </Field>
          </div>

          <Field
            label="Non assujetti à la TVA"
            help="Article 293 B du Code général des impôts."
            layout="checkbox"
          >
            {(p) => <Checkbox {...p} name="vat_exempt" />}
          </Field>

          <Field label="Champ désactivé">
            {(p) => <Input {...p} disabled defaultValue="Non modifiable" />}
          </Field>
        </div>
        <Text size="sm" tone="muted">
          Chaque champ est relié à son étiquette, à son aide et à son erreur par
          <span className="font-mono"> aria-describedby</span>. Le champ en erreur épaissit
          sa bordure en plus de la colorer, et l’erreur est annoncée par
          <span className="font-mono"> role=&quot;alert&quot;</span>.
        </Text>
      </Section>

      <Section title="Cartes">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card elevation="flat">
            <Text size="label" tone="muted">
              Sans ombre
            </Text>
            <Text size="sm">Pour un contenu déjà contenu.</Text>
          </Card>
          <Card elevation="e1">
            <Text size="label" tone="muted">
              Élévation 1
            </Text>
            <Text size="sm">Le repos, le cas courant.</Text>
          </Card>
          <Card elevation="e2">
            <Text size="label" tone="muted">
              Élévation 2
            </Text>
            <Text size="sm">Une carte qu’on veut détacher.</Text>
          </Card>
        </div>
        <Text size="sm" tone="muted">
          En mode sombre, les ombres disparaissent : une ombre noire sur fond sombre est
          invisible. L’élévation passe alors par la surface et la bordure.
        </Text>
      </Section>    </>
  )
}
