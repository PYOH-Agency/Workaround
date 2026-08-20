import { normalizeSiret, isValidSiret } from '@/domain/siret'
import { frenchVatNumber, sirenFromSiret } from '@/domain/vat-number'

/**
 * Client de l'API Recherche d'Entreprises (data.gouv).
 *
 * Ouverte, sans cle ni inscription, alimentee par Sirene et le RNE.
 * Voir docs/superpowers/research/2026-08-08-api-entreprise.md.
 */

const BASE = 'https://recherche-entreprises.api.gouv.fr/search'

/** Libelles des formes juridiques les plus courantes chez les artisans. */
const LEGAL_FORM_LABELS: Record<string, string> = {
  '1000': 'Entreprise individuelle',
  '5202': 'Société en nom collectif',
  '5498': 'EURL',
  '5499': 'SARL',
  '5710': 'SAS',
  '5720': 'SASU',
  '6540': 'SCI',
}

/**
 * Le repli par FAMILLE, sur les deux premiers chiffres.
 *
 * La table ci-dessus ne couvre que les formes d'artisan, et rend `null` pour
 * tout le reste : l'ecran d'inscription affichait alors « SIRET 552 081 317 »
 * sans forme juridique, ce qui donne l'air d'un annuaire incomplet la ou c'est
 * notre table qui l'etait. Une SA, un GIE ou une societe civile d'exercice ne
 * sont pas des cas rares au point de n'avoir aucun nom.
 *
 * Les deux premiers chiffres sont le niveau II de la nomenclature INSEE des
 * categories juridiques, et ils sont stables. Le libelle de famille est moins
 * precis que celui du code exact — « Société anonyme » plutot que « Société
 * anonyme a conseil d'administration » — et c'est assume : mieux vaut un nom
 * juste et large que pas de nom. Une forme qui reviendrait souvent merite en
 * revanche son entree exacte dans la table.
 *
 * **N'entre jamais tel quel sur un devis** : `company.legal_form_label` est
 * relu et corrigeable dans les mentions, ou l'artisan a le dernier mot.
 */
const LEGAL_FORM_FAMILIES: Record<string, string> = {
  '10': 'Entreprise individuelle',
  '52': 'Société en nom collectif',
  '53': 'Société en commandite',
  '54': 'Société à responsabilité limitée',
  '55': 'Société anonyme',
  '56': 'Société anonyme',
  '57': 'Société par actions simplifiée',
  '62': "Groupement d'intérêt économique",
  '65': 'Société civile',
}

function legalFormLabel(code: string | null): string | null {
  if (!code) return null
  return LEGAL_FORM_LABELS[code] ?? LEGAL_FORM_FAMILIES[code.slice(0, 2)] ?? null
}

/**
 * L'entreprise n'existe pas au repertoire — a distinguer d'une panne.
 *
 * Les deux cas menaient au meme `Error`, et l'appelant ne pouvait les separer
 * qu'en lisant un message. Or ils ne disent pas la meme chose au demandeur :
 * « aucune entreprise a ce numero » est un constat, « nous n'avons pas pu
 * verifier » est un aveu. Les confondre en fait un mensonge dans un sens ou
 * dans l'autre.
 */
export class CompanyNotFound extends Error {
  constructor() {
    super('Entreprise introuvable')
    this.name = 'CompanyNotFound'
  }
}

export interface Establishment {
  siret: string
  legalName: string
  legalForm: string | null
  legalFormLabel: string | null
  vatNumber: string | null
  foundedOn: Date | null
  active: boolean
  addressLine1: string
  postalCode: string
  city: string
  rge: boolean
}

interface ApiEstablishment {
  siret: string
  adresse: string | null
  code_postal: string | null
  libelle_commune: string | null
  etat_administratif: string | null
  liste_rge: string[] | null
}

interface ApiResult {
  nom_complet: string
  tva?: string[] | null
  nom_raison_sociale: string | null
  nature_juridique: string | null
  date_creation: string | null
  complements?: { est_rge?: boolean }
  matching_etablissements?: ApiEstablishment[]
}

/**
 * L'adresse d'un matching_etablissement n'est pas decomposee : elle arrive en
 * une seule chaine, code postal et commune compris. On les retire pour ne
 * garder que la voie.
 */
function extractStreet(address: string, postalCode: string, city: string): string {
  return address.replace(new RegExp(`\\s*${postalCode}\\s+${city}\\s*$`, 'i'), '').trim()
}

export async function findEstablishment(input: string): Promise<Establishment> {
  const siret = normalizeSiret(input)
  if (!isValidSiret(siret)) throw new Error('SIRET invalide')

  // `include` exige `minimal=true`, et sans `matching_etablissements` l'API
  // renvoie le siege plutot que l'etablissement demande.
  //
  // `tva` doit etre demande explicitement : `minimal=true` elague ce champ, et
  // son absence passait inapercue parce que nos fixtures, elles, le
  // contenaient. C'est le test d'integration qui l'a revele.
  const url = `${BASE}?q=${siret}&minimal=true&include=matching_etablissements,tva&per_page=1`

  let response: Response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error('Service de recherche indisponible')
  }

  if (!response.ok) throw new Error(`Service de recherche indisponible (${response.status})`)

  const { results } = (await response.json()) as { results?: ApiResult[] }
  const result = results?.[0]

  // La recherche est plein texte, donc floue : on n'accepte que l'etablissement
  // dont le SIRET correspond exactement a la demande.
  const establishment = result?.matching_etablissements?.find((e) => e.siret === siret)
  if (!result || !establishment) throw new CompanyNotFound()

  const postalCode = establishment.code_postal ?? ''
  const city = establishment.libelle_commune ?? ''

  return {
    siret: establishment.siret,
    // Pour un entrepreneur individuel — la forme dominante du metier —
    // nom_raison_sociale est nul. Le nom est toujours dans nom_complet.
    legalName: result.nom_complet,
    legalForm: result.nature_juridique,
    legalFormLabel: legalFormLabel(result.nature_juridique),
    // L'API ne publie pas de numero de TVA pour les entrepreneurs individuels
    // — la forme dominante du metier. On le calcule alors depuis le SIREN, ce
    // qui evite de le demander a l'artisan : il ne l'a jamais sous la main et
    // le saisirait de travers sur un document legal. S'il est en franchise en
    // base, il coche la case et le numero n'est pas affiche.
    vatNumber: result.tva?.[0] ?? frenchVatNumber(sirenFromSiret(siret)),
    foundedOn: result.date_creation ? new Date(result.date_creation) : null,
    active: establishment.etat_administratif === 'A',
    addressLine1: extractStreet(establishment.adresse ?? '', postalCode, city),
    postalCode,
    city,
    rge: result.complements?.est_rge ?? (establishment.liste_rge?.length ?? 0) > 0,
  }
}
