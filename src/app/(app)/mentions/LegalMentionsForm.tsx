'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Checkbox } from '@/ui/atoms/checkbox'
import { Heading } from '@/ui/atoms/heading'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Field } from '@/ui/molecules/field'
import { saveLegalMentions, type LegalFormState } from './actions'

const initialState: LegalFormState = {}

export interface LegalDefaults {
  legalFormLabel: string
  registrationNumber: string
  phone: string
  email: string
  vatNumber: string
  vatExempt: boolean
  quoteValidityDays: number
  paymentTerms: string
  insurerName: string
  insurerAddress: string
  policyNumber: string
  coveredActivities: string
  coverageArea: string
}

export function LegalMentionsForm({ defaults }: { defaults: LegalDefaults }) {
  const [state, action, pending] = useActionState(saveLegalMentions, initialState)
  const [vatExempt, setVatExempt] = useState(defaults.vatExempt)

  return (
    <form action={action} className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <Heading level={3} as="h2">
          Votre entreprise
        </Heading>

        <Field
          label="Forme juridique"
          help="Pour un entrepreneur individuel, la mention « EI » doit apparaître."
          required
        >
          {(p) => (
            <Input {...p} name="legal_form_label" defaultValue={defaults.legalFormLabel} />
          )}
        </Field>

        <Field
          label="Numéro d’immatriculation"
          help="RCS ou Répertoire des métiers, avec la ville."
          required
        >
          {(p) => (
            <Input
              {...p}
              name="registration_number"
              placeholder="RCS Bordeaux 507 698 207"
              defaultValue={defaults.registrationNumber}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Téléphone" required>
            {(p) => (
              <Input {...p} name="phone" type="tel" defaultValue={defaults.phone} />
            )}
          </Field>
          <Field label="E-mail" required>
            {(p) => (
              <Input {...p} name="email" type="email" defaultValue={defaults.email} />
            )}
          </Field>
        </div>

        <Field label="Je suis en franchise en base de TVA" layout="checkbox">
          {(p) => (
            <Checkbox
              {...p}
              name="vat_exempt"
              checked={vatExempt}
              onChange={(e) => setVatExempt(e.target.checked)}
            />
          )}
        </Field>

        {!vatExempt && (
          <Field
            label="Numéro de TVA intracommunautaire"
            help="Récupéré automatiquement depuis votre SIRET."
            required
          >
            {(p) => <Input {...p} name="vat_number" defaultValue={defaults.vatNumber} />}
          </Field>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <Heading level={3} as="h2">
          Conditions de vos devis
        </Heading>

        <div className="sm:max-w-xs">
          <Field label="Durée de validité (jours)" help="Usage courant : 90 jours." required>
            {(p) => (
              <Input
                {...p}
                name="quote_validity_days"
                type="number"
                min="1"
                defaultValue={defaults.quoteValidityDays}
              />
            )}
          </Field>
        </div>

        <Field
          label="Modalités de paiement"
          help="Acompte, échéances et moyens de paiement acceptés."
          required
        >
          {(p) => (
            <Textarea
              {...p}
              name="payment_terms"
              rows={2}
              defaultValue={defaults.paymentTerms}
            />
          )}
        </Field>
      </section>

      <section className="flex flex-col gap-5">
        <Heading level={3} as="h2">
          Votre assurance professionnelle
        </Heading>
        <Text size="sm" tone="soft">
          Ces mentions figurent sur votre attestation d’assurance décennale.
        </Text>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom de l’assureur" required>
            {(p) => (
              <Input {...p} name="insurer_name" defaultValue={defaults.insurerName} />
            )}
          </Field>
          <Field label="Référence du contrat" required>
            {(p) => (
              <Input {...p} name="policy_number" defaultValue={defaults.policyNumber} />
            )}
          </Field>
        </div>

        <Field label="Adresse de l’assureur" required>
          {(p) => (
            <Input {...p} name="insurer_address" defaultValue={defaults.insurerAddress} />
          )}
        </Field>

        <Field
          label="Activités garanties"
          help="Reprenez la liste exacte de votre attestation. C’est elle qui déterminera plus tard les activités que vous pourrez afficher publiquement."
          required
        >
          {(p) => (
            <Textarea
              {...p}
              name="covered_activities"
              rows={2}
              defaultValue={defaults.coveredActivities}
            />
          )}
        </Field>

        <Field label="Zone géographique couverte" required>
          {(p) => (
            <Input {...p} name="coverage_area" defaultValue={defaults.coverageArea} />
          )}
        </Field>
      </section>

      {/*
        L'action ne renvoie qu'un message global — `LegalFormState` ne porte pas
        d'erreurs par champ. On l'affiche donc ici plutot que de le passer aux
        `Field` : elargir l'action releverait du metier, pas de la reprise
        d'interface.
      */}
      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}

      <div className="self-start">
        <Button type="submit" size="lg" pending={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
