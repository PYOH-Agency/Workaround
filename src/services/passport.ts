import { like } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { companySlug, sirenFromSlug } from '@/domain/slug'
import { recordEvent } from '@/services/events'
import { companyCoverage } from '@/services/visibility'

/**
 * D'ou vient une consultation de passeport.
 *
 * Liste **fermee**, et c'est tout l'interet : la valeur arrive par la chaine de
 * requete, donc de l'exterieur, et elle finit dans un journal qu'aucune
 * suppression ne peut atteindre. Ce qui n'est pas reconnu devient `direct` —
 * rien d'exterieur n'est jamais stocke tel quel.
 *
 * C'est la lecon de M1, ou une adresse en clair dans le journal avait rendu le
 * droit a l'effacement structurellement impossible.
 */
const SOURCES = ['courriel', 'devis'] as const

export type PassportSource = (typeof SOURCES)[number]

export interface PassportLink {
  /** Adresse nue : celle qu'on imprime, et qu'un humain peut recopier. */
  url: string
  /**
   * Les activites **reellement couvertes**, jamais celles declarees.
   *
   * La distinction n'est pas cosmetique. `company.coveredActivities` est la
   * chaine que l'artisan a saisie pour ses mentions L243-2 : elle est
   * declarative, et l'apposer sur un sceau qui dit « attestations controlees »
   * serait exactement le mensonge que le produit existe pour supprimer.
   */
  activities: string[]
}

/**
 * Le passeport d'une entreprise, ou `null` si elle n'en a pas.
 *
 * Le `null` n'est pas une precaution de style. Une entreprise dont aucune
 * activite n'est couverte n'a pas de page publique : poser sur son devis un
 * lien qui repond 404 serait pire que ne rien poser du tout, et exactement au
 * moment ou le client evalue son serieux.
 *
 * L'adresse passe par `/p/` et non par `/artisan/` : c'est ce detour qui rend
 * la consultation mesurable. Sans mesure, on ne saura jamais si le passeport
 * interesse quelqu'un — et c'est la question qui decide de la suite.
 */
export async function passportLink(
  subject: { id: string; legalName: string; siret: string },
  now: Date,
): Promise<PassportLink | null> {
  const coverage = await companyCoverage(subject.id, now)
  if (!coverage.isPublic) return null

  return {
    url: `${process.env.APP_URL}/p/${companySlug(subject.legalName, subject.siret)}`,
    // Meme raccourci que sur le passeport : le libelle du referentiel porte une
    // precision d'assureur — « Plomberie — installations sanitaires » — dont le
    // demandeur n'a que faire quand il lit un sceau.
    activities: coverage.activities
      .filter((a) => a.visible)
      .map((a) => a.label.split(' —')[0]),
  }
}

/**
 * La meme adresse, mais qui dit d'ou l'on vient.
 *
 * Separee du calcul parce qu'une adresse sert souvent deux surfaces a la fois :
 * le devis en ligne et son PDF partent du meme chargement, et n'ont pourtant
 * rien a nous apprendre l'un sur l'autre. Sur un document imprime, personne ne
 * recopie une chaine de requete — le PDF garde l'adresse nue et se compte en
 * « direct ».
 *
 * C'est aussi le seul endroit ou `?via=` est ecrit.
 */
export function trackedPassport(url: string, via: PassportSource): string {
  return `${url}?via=${via}`
}

/**
 * Enregistre une consultation et rend l'adresse canonique du passeport.
 *
 * Le journal recoit **le fait** — telle entreprise a ete consultee, par quel
 * canal, a quelle date — et rien d'autre. Ni adresse d'origine, ni empreinte,
 * ni identifiant de visiteur : la meme regle qu'au formulaire de contact de M4.
 * Ce fait suffit a ce qu'on veut savoir, et n'expose personne.
 */
export async function recordPassportView(slug: string, via: string | null): Promise<string | null> {
  const siren = sirenFromSlug(slug)
  if (!siren) return null

  const [found] = await db
    .select({ id: company.id })
    .from(company)
    .where(like(company.siret, `${siren}%`))
    .limit(1)

  if (!found) return null

  await recordEvent({
    type: 'passport.viewed',
    subjectType: 'company',
    subjectId: found.id,
    companyId: found.id,
    // Le demandeur n'a pas de compte et n'en aura pas ici : l'acteur est
    // qualifie, jamais identifie. Aucun `actorId`.
    actorType: 'customer',
    payload: { via: knownSource(via) },
  })

  return `/artisan/${slug}`
}

function knownSource(via: string | null): PassportSource | 'direct' {
  return (SOURCES as readonly string[]).includes(via ?? '') ? (via as PassportSource) : 'direct'
}
