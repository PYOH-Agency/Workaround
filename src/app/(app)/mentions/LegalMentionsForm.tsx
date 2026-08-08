'use client'

import { useActionState, useState } from 'react'
import { saveLegalMentions, type LegalFormState } from './actions'

const initialState: LegalFormState = {}
const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'

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
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Votre entreprise</h2>

        <label className="flex flex-col gap-2 text-sm">
          Forme juridique
          <input
            name="legal_form_label"
            required
            defaultValue={defaults.legalFormLabel}
            className={field}
          />
          <span className="text-xs opacity-60">
            Pour un entrepreneur individuel, la mention « EI » doit apparaître.
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Numéro d’immatriculation
          <input
            name="registration_number"
            required
            placeholder="RCS Bordeaux 507 698 207"
            defaultValue={defaults.registrationNumber}
            className={field}
          />
          <span className="text-xs opacity-60">RCS ou Répertoire des métiers, avec la ville.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            Téléphone
            <input name="phone" required defaultValue={defaults.phone} className={field} />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            E-mail
            <input
              name="email"
              type="email"
              required
              defaultValue={defaults.email}
              className={field}
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="vat_exempt"
            checked={vatExempt}
            onChange={(e) => setVatExempt(e.target.checked)}
          />
          Je suis en franchise en base de TVA
        </label>

        {!vatExempt && (
          <label className="flex flex-col gap-2 text-sm">
            Numéro de TVA intracommunautaire
            <input
              name="vat_number"
              required
              defaultValue={defaults.vatNumber}
              className={`${field} font-mono`}
            />
            <span className="text-xs opacity-60">Récupéré automatiquement depuis votre SIRET.</span>
          </label>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Conditions de vos devis</h2>

        <label className="flex flex-col gap-2 text-sm sm:max-w-xs">
          Durée de validité (jours)
          <input
            name="quote_validity_days"
            type="number"
            min="1"
            required
            defaultValue={defaults.quoteValidityDays}
            className={field}
          />
          <span className="text-xs opacity-60">Usage courant : 90 jours.</span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Modalités de paiement
          <textarea
            name="payment_terms"
            required
            rows={2}
            defaultValue={defaults.paymentTerms}
            className={field}
          />
          <span className="text-xs opacity-60">
            Acompte, échéances et moyens de paiement acceptés.
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Votre assurance professionnelle</h2>
        <p className="-mt-2 text-sm opacity-70">
          Ces mentions figurent sur votre attestation d’assurance décennale.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            Nom de l’assureur
            <input
              name="insurer_name"
              required
              defaultValue={defaults.insurerName}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Référence du contrat
            <input
              name="policy_number"
              required
              defaultValue={defaults.policyNumber}
              className={`${field} font-mono`}
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          Adresse de l’assureur
          <input
            name="insurer_address"
            required
            defaultValue={defaults.insurerAddress}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Activités garanties
          <textarea
            name="covered_activities"
            required
            rows={2}
            defaultValue={defaults.coveredActivities}
            className={field}
          />
          <span className="text-xs opacity-60">
            Reprenez la liste exacte de votre attestation. C’est elle qui déterminera plus tard les
            activités que vous pourrez afficher publiquement.
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Zone géographique couverte
          <input
            name="coverage_area"
            required
            defaultValue={defaults.coverageArea}
            className={field}
          />
        </label>
      </section>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
