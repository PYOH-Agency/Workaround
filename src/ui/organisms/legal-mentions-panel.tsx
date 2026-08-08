import { Text } from '@/ui/atoms/text'

/**
 * Garde-fou des mentions obligatoires.
 *
 * Elles sont nullables en base, mais ni un devis ni une facture ne peuvent etre
 * emis sans elles : `hasLegalMentions` le bloque a la redaction. Ce garde-fou
 * existe pour le cas ou cette invariante serait rompue en amont — il echoue
 * bruyamment plutot que d'afficher un document silencieusement non conforme.
 *
 * L'article L243-2 expose l'artisan a 3 000 EUR d'amende, 15 000 EUR pour une
 * societe, par infraction constatee. Un incident visible coute moins cher
 * qu'une amende invisible.
 */
export function mention(value: string | null | undefined, field: string): string {
  if (!value) {
    throw new Error(`Mention légale absente sur un document émis : ${field}`)
  }
  return value
}

/**
 * Les mentions imposees par l'article L243-2 du Code des assurances.
 *
 * Leur absence expose l'artisan a 3 000 EUR d'amende, 15 000 EUR pour une
 * societe, **par infraction constatee**. Aucune prop n'est donc optionnelle : un
 * champ manquant est une erreur de compilation, pas un bloc qui s'affiche a
 * moitie.
 */
export function LegalMentionsPanel({
  legalName,
  legalFormLabel,
  registrationNumber,
  siret,
  vatLine,
  phone,
  email,
  insurerName,
  insurerAddress,
  policyNumber,
  coveredActivities,
  coverageArea,
}: {
  legalName: string
  legalFormLabel: string
  registrationNumber: string
  siret: string
  vatLine: string
  phone: string
  email: string
  insurerName: string
  insurerAddress: string
  policyNumber: string
  coveredActivities: string
  coverageArea: string
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-rule pt-5">
      <div className="flex flex-col gap-0.5">
        <Text size="sm" tone="muted">
          {legalName} — {legalFormLabel} · {registrationNumber}
        </Text>
        <Text size="sm" tone="muted">
          SIRET {siret} · {vatLine}
        </Text>
        <Text size="sm" tone="muted">
          {phone} · {email}
        </Text>
      </div>

      <div className="flex flex-col gap-0.5">
        <Text size="label" tone="muted">
          Assurance professionnelle
        </Text>
        <Text size="sm" tone="muted">
          {insurerName} — {insurerAddress}
        </Text>
        <Text size="sm" tone="muted">
          Contrat n° {policyNumber}
        </Text>
        <Text size="sm" tone="muted">
          Activités garanties : {coveredActivities}
        </Text>
        <Text size="sm" tone="muted">
          Couverture géographique : {coverageArea}
        </Text>
      </div>
    </section>
  )
}
