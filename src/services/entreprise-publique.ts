import { normaliserSiret, siretValide } from '@/domain/siret'

/**
 * Client de l'API Recherche d'Entreprises (data.gouv).
 *
 * Ouverte, sans cle ni inscription, alimentee par Sirene et le RNE.
 * Voir docs/superpowers/research/2026-08-08-api-entreprise.md.
 */

const BASE = 'https://recherche-entreprises.api.gouv.fr/search'

export interface Etablissement {
  siret: string
  raisonSociale: string
  formeJuridique: string | null
  dateCreation: Date | null
  actif: boolean
  adresseLigne1: string
  codePostal: string
  ville: string
  rge: boolean
}

interface EtablissementApi {
  siret: string
  adresse: string | null
  code_postal: string | null
  libelle_commune: string | null
  etat_administratif: string | null
  liste_rge: string[] | null
}

interface ResultatApi {
  nom_complet: string
  nom_raison_sociale: string | null
  nature_juridique: string | null
  date_creation: string | null
  complements?: { est_rge?: boolean }
  matching_etablissements?: EtablissementApi[]
}

/**
 * L'adresse d'un matching_etablissement n'est pas decomposee : elle arrive en
 * une seule chaine, code postal et commune compris. On les retire pour ne
 * garder que la voie.
 */
function extraireVoie(adresse: string, codePostal: string, ville: string): string {
  return adresse
    .replace(new RegExp(`\\s*${codePostal}\\s+${ville}\\s*$`, 'i'), '')
    .trim()
}

export async function rechercherEtablissement(saisie: string): Promise<Etablissement> {
  const siret = normaliserSiret(saisie)
  if (!siretValide(siret)) throw new Error('SIRET invalide')

  // `include` exige `minimal=true`, et sans `matching_etablissements` l'API
  // renvoie le siege plutot que l'etablissement demande.
  const url = `${BASE}?q=${siret}&minimal=true&include=matching_etablissements&per_page=1`

  let reponse: Response
  try {
    reponse = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error('Service de recherche indisponible')
  }

  if (!reponse.ok) throw new Error(`Service de recherche indisponible (${reponse.status})`)

  const { results } = (await reponse.json()) as { results?: ResultatApi[] }
  const resultat = results?.[0]

  // La recherche est plein texte, donc floue : on n'accepte que l'etablissement
  // dont le SIRET correspond exactement a la demande.
  const etablissement = resultat?.matching_etablissements?.find((e) => e.siret === siret)
  if (!resultat || !etablissement) throw new Error('Entreprise introuvable')

  const codePostal = etablissement.code_postal ?? ''
  const ville = etablissement.libelle_commune ?? ''

  return {
    siret: etablissement.siret,
    // Pour un entrepreneur individuel — la forme dominante du metier —
    // nom_raison_sociale est nul. Le nom est toujours dans nom_complet.
    raisonSociale: resultat.nom_complet,
    formeJuridique: resultat.nature_juridique,
    dateCreation: resultat.date_creation ? new Date(resultat.date_creation) : null,
    actif: etablissement.etat_administratif === 'A',
    adresseLigne1: extraireVoie(etablissement.adresse ?? '', codePostal, ville),
    codePostal,
    ville,
    rge: resultat.complements?.est_rge ?? (etablissement.liste_rge?.length ?? 0) > 0,
  }
}
