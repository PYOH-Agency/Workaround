# M3 — Vérification et page publique · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire en sorte qu'une entreprise visible publiquement sur Workaround soit assurée pour chacune des activités qu'elle affiche — et qu'un demandeur puisse le constater sur une page publique.

**Architecture:** Trois sources ouvertes alimentent le contrôle automatique (Sirene, BODACC, ADEME) ; l'assurance, que nous ne pouvons récupérer nulle part, est déposée par l'artisan puis validée par un humain. La visibilité **se calcule** à chaque lecture à partir des activités déclarées, des attestations validées et des dates — elle ne se stocke jamais. Le journal d'événements n'enregistre que les **transitions**.

**Tech Stack:** Identique à M1 et M2 — Next.js 16, PostgreSQL sur Supabase, Drizzle, Supabase Storage, Vitest, Playwright. Aucune dépendance nouvelle.

> **Déviation de format, assumée comme en M2.** Les écrans dont la structure existe déjà — garde de session, tableau, formulaire d'action — renvoient à leurs équivalents de M1 et M2 plutôt que d'en recopier le code. Le code complet est donné partout où la logique est neuve : couverture, correspondance, transitions de visibilité, préavis. C'est là que se trouvent les erreurs coûteuses.

**Références :** [spec P1 §8](../specs/2026-08-07-socle-artisan-design.md) · [sources de vérification](../research/2026-08-08-sources-de-verification.md) · [AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md)

---

## Décisions verrouillées

**La visibilité se calcule, elle ne se stocke pas.** Un drapeau `visible` en base dériverait de la vérité dès le lendemain de l'expiration d'une attestation : l'entreprise resterait affichée jusqu'à ce qu'un travail de fond passe. Le calcul se fait à la lecture, à partir des activités déclarées, des attestations validées et de la date. C'est la même règle que le reste à facturer de M2 — *un solde stocké finit toujours par mentir*.

**La correspondance entre un libellé d'attestation et une activité du référentiel est un acte humain, tracé.** Jamais déduite en silence. C'est elle qui décide de ce qu'un demandeur va croire, donc c'est elle qui engage. Chaque lien porte qui l'a validé et quand.

**Le référentiel d'activités est une donnée, pas du code.** Table alimentée par migration, enrichissable sans redéploiement.

**L'assurance requise est une colonne du référentiel, pas une déduction.** Voir la note de la Task 1 : l'appartenance à la nomenclature ne suffit pas à conclure à la décennale.

**Aucune suspension muette.** Préavis, explication, voie de rétablissement, recours humain. Ce ne sont pas des attentions : sans elles, le traitement est illicite (article 22.3).

**L'outil reste ouvert, la vitrine est exigeante.** Une activité non couverte disparaît de la page publique ; l'artisan conserve devis, factures et historique. Sans cette séparation, le droit d'opposition de l'AIPD serait illusoire.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/activity.ts` | Types du référentiel et de l'assurance requise |
| `src/domain/coverage.ts` | **Quelle activité est publiquement visible** — pur, sans I/O. Le cœur du jalon |
| `src/domain/bodacc.ts` | Classement des familles d'avis en bloquant / signal / neutre |
| `src/domain/rge.ts` | Qualifications RGE actives à une date donnée |
| `src/domain/slug.ts` | Adresse publique stable d'une entreprise |
| `src/db/schema/verification.ts` | `activity`, `company_activity`, `insurance_certificate`, `certificate_activity`, `legal_check` |
| `src/db/schema/staff.ts` | Relecteurs internes |
| `supabase/migrations/9004_activity_reference.sql` | Le référentiel, en données |
| `supabase/migrations/9005_certificates_bucket.sql` | Dépôt privé des attestations |
| `src/services/legal-checks.ts` | Sirene et BODACC |
| `src/services/rge-lookup.ts` | ADEME |
| `src/services/certificates.ts` | Dépôt, revue, correspondance |
| `src/services/visibility.ts` | Calcul, transitions, préavis |
| `src/app/(app)/verification/**` | Écrans artisan |
| `src/app/(admin)/attestations/**` | File de revue interne |
| `src/app/artisan/[slug]/page.tsx` | Page publique |
| `src/app/api/cron/echeances/route.ts` | Préavis J-60, J-30, J-7 |

---

## Task 1 : Le référentiel d'activités

**Files:**
- Create: `src/domain/activity.ts`, `supabase/migrations/9004_activity_reference.sql`
- Test: `tests/domain/activity.test.ts`

> **Note pour l'implémenteur — à lire avant d'écrire la migration.**
>
> La nomenclature de référence est celle de **France Assureurs, révision 2019** : cinq familles, activités numérotées. C'est le vocabulaire dans lequel les assureurs rédigent les « activités garanties » des attestations que ce jalon doit lire.
>
> **Ne recopiez pas cette liste de mémoire.** Récupérez le document officiel et transcrivez-le. Une erreur de libellé ici se propage jusqu'à la correspondance avec les attestations, où elle produit une couverture fausse. Cette consigne existe parce qu'en M1 trois numéros de TVA ont été écrits de mémoire, et les trois étaient faux.
>
> **Et surtout : l'assurance requise ne se déduit pas de l'appartenance à la liste.** La nomenclature comporte des entrées qui n'engagent pas la garantie décennale — *4.1 Paysagiste*, *18.1 Agencement de cuisines, magasins, salles de bain*. Elles y figurent parce que les assureurs les nomment sur les mêmes contrats, pas parce qu'elles constituent un ouvrage au sens de l'article 1792. `requires_decennale` est donc une **colonne renseignée activité par activité**, pas un calcul.

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/activity.test.ts
import { describe, it, expect } from 'vitest'
import { requiredInsurance, ACTIVITY_FAMILIES, type Activity } from '@/domain/activity'

const plumbing: Activity = {
  code: '30',
  label: 'Plomberie — Installations sanitaires',
  family: 'technical',
  requiresDecennale: true,
}

const landscaping: Activity = {
  code: '4.1',
  label: 'Paysagiste',
  family: 'site',
  requiresDecennale: false,
}

describe('assurance requise par activite', () => {
  it('exige la decennale sur un ouvrage', () => {
    expect(requiredInsurance(plumbing)).toBe('decennale')
  })

  it("exige la RC Pro sur une activite qui n'engage pas l'article 1792", () => {
    // Le paysagiste figure dans la nomenclature des assureurs sans pour autant
    // constituer un ouvrage : deduire la decennale de l'appartenance a la liste
    // produirait une exigence fausse.
    expect(requiredInsurance(landscaping)).toBe('rc_pro')
  })

  it('couvre les cinq familles de la nomenclature', () => {
    expect(ACTIVITY_FAMILIES.map((f) => f.code)).toEqual([
      'site',
      'structure',
      'envelope',
      'fitting',
      'technical',
    ])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/activity.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/activity.ts

/**
 * Referentiel d'activites, aligne sur la nomenclature France Assureurs
 * (revision 2019) — le vocabulaire dans lequel sont redigees les activites
 * garanties des attestations d'assurance.
 *
 * Qualibat a ete ecarte : il nomme des *competences* reconnues, pas des
 * *activites* exercees. Partir de lui obligerait a traduire chaque libelle
 * d'attestation vers une nomenclature etrangere, au point le plus fragile de la
 * chaine.
 */
export type InsuranceKind = 'decennale' | 'rc_pro'

export type ActivityFamily = 'site' | 'structure' | 'envelope' | 'fitting' | 'technical'

export const ACTIVITY_FAMILIES: { code: ActivityFamily; label: string }[] = [
  { code: 'site', label: 'Préparation et aménagement du site' },
  { code: 'structure', label: 'Structure et gros œuvre' },
  { code: 'envelope', label: 'Clos et couvert' },
  { code: 'fitting', label: 'Divisions, aménagements et finitions' },
  { code: 'technical', label: 'Lots techniques et activités spécifiques' },
]

export interface Activity {
  /** Numero de la nomenclature : « 30 », « 4.1 ». */
  code: string
  label: string
  family: ActivityFamily
  /**
   * Renseigne activite par activite, jamais deduit de l'appartenance a la
   * liste : la nomenclature contient des entrees qui n'engagent pas la garantie
   * decennale (paysagiste, agencement).
   */
  requiresDecennale: boolean
}

export function requiredInsurance(activity: Activity): InsuranceKind {
  return activity.requiresDecennale ? 'decennale' : 'rc_pro'
}
```

- [ ] **Step 4 : Écrire la migration du référentiel**

Créer `supabase/migrations/9004_activity_reference.sql`. La table est créée par drizzle en Task 5 ; **cette migration ne fait que l'alimenter**, et porte donc un numéro supérieur.

```sql
-- Referentiel des activites du batiment, nomenclature France Assureurs
-- (revision 2019). C'est une DONNEE, pas du code : elle s'enrichit par une
-- nouvelle migration, sans toucher au schema.
--
-- `requires_decennale` est renseigne activite par activite. Une entree de la
-- nomenclature n'engage pas necessairement l'article 1792 du Code civil.

INSERT INTO activity (code, label, family, requires_decennale) VALUES
  ('1',    'Démolition',                                   'site',      true),
  ('2',    'Terrassement',                                 'site',      true),
  ('3',    'Amélioration des sols',                        'site',      true),
  ('4',    'V.R.D. — canalisations, assainissement, chaussées, trottoirs', 'site', true),
  ('4.1',  'Paysagiste',                                   'site',      false),
  ('5',    'Montage d''échafaudage — étaiement',           'site',      true),
  ('6',    'Traitement amiante',                           'site',      true),
  ('7',    'Traitement curatif (insectes xylophages, champignons)', 'site', true),
  ('8',    'Assèchement des murs',                         'site',      true),
  ('9',    'Fondations spéciales',                         'structure', true),
  ('10',   'Maçonnerie et béton armé sauf précontraint in situ', 'structure', true),
  ('11',   'Béton précontraint in situ',                   'structure', true),
  ('12',   'Charpente et structure en bois',               'structure', true),
  ('13',   'Charpente et structure métallique',            'structure', true),
  ('14',   'Couverture',                                   'envelope',  true),
  ('15',   'Étanchéité de toiture, terrasse et plancher intérieur', 'envelope', true),
  ('16',   'Étanchéité et imperméabilisation de cuvelage, réservoirs et piscines', 'envelope', true),
  ('17',   'Calfeutrement, imperméabilité et étanchéité des façades', 'envelope', true),
  ('18',   'Menuiseries extérieures',                      'envelope',  true),
  ('19',   'Bardages de façade',                           'envelope',  true),
  ('20',   'Façades-rideaux',                              'envelope',  true),
  ('21',   'Structures et couvertures textiles',           'envelope',  true),
  ('22',   'Menuiseries intérieures',                      'fitting',   true),
  ('23',   'Plâtrerie — staff, stuc, gypserie',            'fitting',   true),
  ('24',   'Serrurerie — métallerie',                      'fitting',   true),
  ('25',   'Vitrerie — miroiterie',                        'fitting',   true),
  ('26',   'Peinture',                                     'fitting',   true),
  ('27',   'Revêtement de surfaces en matériaux souples et parquets flottants', 'fitting', true),
  ('28',   'Revêtement de surfaces en matériaux durs — chapes et sols coulés', 'fitting', true),
  ('29',   'Isolation thermique, acoustique, frigorifique', 'fitting',  true),
  ('18.1', 'Agencement de cuisines, magasins, salles de bain', 'fitting', false),
  ('30',   'Plomberie — installations sanitaires',         'technical', true),
  ('31',   'Installations thermiques de génie climatique', 'technical', true),
  ('32',   'Fumisterie',                                   'technical', true),
  ('33',   'Installations d''aéraulique et de conditionnement d''air', 'technical', true),
  ('34',   'Électricité',                                  'technical', true),
  ('35',   'Four et cheminée industriels',                 'technical', true),
  ('36',   'Ascenseurs',                                   'technical', true),
  ('37',   'Piscines',                                     'technical', true),
  ('38',   'Maison à ossature bois',                       'technical', true),
  ('39',   'Géothermie',                                   'technical', true)
ON CONFLICT (code) DO NOTHING;
```

> **Vérifiez cette liste contre le document officiel avant de la committer.** Elle est transcrite d'une source secondaire. Les libellés doivent correspondre à ceux que portent les attestations, sans quoi la correspondance de la Task 8 travaillera sur un vocabulaire décalé.

- [ ] **Step 5 : Lancer les tests**

Run: `pnpm vitest run tests/domain/activity.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 6 : Commit**

```bash
git add src/domain/activity.ts tests/domain/activity.test.ts supabase/migrations/9004_activity_reference.sql
git commit -m "feat: referentiel d'activites, nomenclature France Assureurs"
```

---

## Task 2 : La couverture — le cœur du jalon

Fonction pure. C'est elle qui produit la phrase que personne d'autre ne peut prononcer : *« tout professionnel visible ici est assuré pour ce qu'il fait. »*

**Files:**
- Create: `src/domain/coverage.ts`
- Test: `tests/domain/coverage.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/coverage.test.ts
import { describe, it, expect } from 'vitest'
import { activityVisibility, publiclyVisible, type CoverageInput } from '@/domain/coverage'

const NOW = new Date('2026-08-08')

const base: CoverageInput = {
  declared: [{ code: '30', requiresDecennale: true }],
  certified: [
    { code: '30', kind: 'decennale', validFrom: new Date('2026-01-01'), validUntil: new Date('2026-12-31') },
  ],
  legalStatus: 'active',
  now: NOW,
}

describe('visibilite d une activite', () => {
  it('affiche une activite couverte par la bonne assurance, en cours de validite', () => {
    expect(activityVisibility(base)).toEqual([{ code: '30', visible: true, reason: 'covered' }])
  })

  it('masque une activite declaree sans aucune attestation', () => {
    expect(activityVisibility({ ...base, certified: [] })).toEqual([
      { code: '30', visible: false, reason: 'no_certificate' },
    ])
  })

  it('masque une activite couverte par la mauvaise assurance', () => {
    // Le piege numero un du secteur : un artisan assure en RC Pro qui pose des
    // equipements engageant la decennale. Le client n'a aucun recours, et
    // personne ne le controle.
    expect(
      activityVisibility({
        ...base,
        certified: [{ ...base.certified[0], kind: 'rc_pro' }],
      }),
    ).toEqual([{ code: '30', visible: false, reason: 'wrong_insurance' }])
  })

  it('masque une activite dont l attestation a expire', () => {
    expect(activityVisibility({ ...base, now: new Date('2027-01-01') })).toEqual([
      { code: '30', visible: false, reason: 'expired' },
    ])
  })

  it('masque une activite dont l attestation ne court pas encore', () => {
    expect(activityVisibility({ ...base, now: new Date('2025-12-01') })).toEqual([
      { code: '30', visible: false, reason: 'expired' },
    ])
  })

  it('masque tout quand l entreprise est en procedure collective', () => {
    expect(activityVisibility({ ...base, legalStatus: 'blocked' })).toEqual([
      { code: '30', visible: false, reason: 'legal_block' },
    ])
  })

  it('ne se laisse pas sauver par une attestation portant une autre activite', () => {
    expect(
      activityVisibility({
        ...base,
        certified: [{ ...base.certified[0], code: '34' }],
      }),
    ).toEqual([{ code: '30', visible: false, reason: 'no_certificate' }])
  })

  it('traite chaque activite separement — la suspension est granulaire', () => {
    // C'est le point que le marche ne fait pas : une entreprise peut perdre la
    // visibilite sur une activite et la garder sur une autre.
    const result = activityVisibility({
      ...base,
      declared: [
        { code: '30', requiresDecennale: true },
        { code: '34', requiresDecennale: true },
      ],
    })

    expect(result).toEqual([
      { code: '30', visible: true, reason: 'covered' },
      { code: '34', visible: false, reason: 'no_certificate' },
    ])
  })

  it('accepte une RC Pro sur une activite qui n exige pas la decennale', () => {
    expect(
      activityVisibility({
        ...base,
        declared: [{ code: '4.1', requiresDecennale: false }],
        certified: [{ ...base.certified[0], code: '4.1', kind: 'rc_pro' }],
      }),
    ).toEqual([{ code: '4.1', visible: true, reason: 'covered' }])
  })

  it('accepte une decennale sur une activite qui n exigeait que la RC Pro', () => {
    // La decennale est plus large : refuser serait absurde.
    expect(
      activityVisibility({
        ...base,
        declared: [{ code: '4.1', requiresDecennale: false }],
        certified: [{ ...base.certified[0], code: '4.1', kind: 'decennale' }],
      }),
    ).toEqual([{ code: '4.1', visible: true, reason: 'covered' }])
  })
})

describe('presence de l entreprise dans l annuaire', () => {
  it('est publique des qu une activite est couverte', () => {
    expect(publiclyVisible(base)).toBe(true)
  })

  it("n'est pas publique si aucune activite ne l est", () => {
    // Une fiche sans aucune activite couverte ne dit rien au demandeur, et
    // affaiblit la promesse de l'annuaire.
    expect(publiclyVisible({ ...base, certified: [] })).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/coverage.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/coverage.ts
import type { InsuranceKind } from './activity'

/**
 * Quelle activite est publiquement visible.
 *
 * Le cœur de M3, et la raison d'etre du produit : l'assurance est souscrite
 * PAR ACTIVITE DECLAREE. Un artisan assure en plomberie qui refait un tableau
 * electrique n'est pas couvert, et son client n'a aucun recours en cas de
 * sinistre. C'est le piege numero un du secteur et personne ne le controle.
 *
 * Fonction pure prenant la date courante en parametre : une visibilite qui
 * depend de l'horloge est intestable si l'horloge est implicite.
 */
export interface DeclaredActivity {
  code: string
  requiresDecennale: boolean
}

export interface CertifiedActivity {
  code: string
  kind: InsuranceKind
  validFrom: Date
  validUntil: Date
}

export type CoverageReason =
  | 'covered'
  | 'no_certificate'
  | 'wrong_insurance'
  | 'expired'
  | 'legal_block'

export interface ActivityVisibility {
  code: string
  visible: boolean
  reason: CoverageReason
}

export interface CoverageInput {
  declared: DeclaredActivity[]
  certified: CertifiedActivity[]
  /** Issu des controles legaux : procedure collective, radiation, cessation. */
  legalStatus: 'active' | 'blocked'
  now: Date
}

/** La decennale couvre plus large que la RC Pro : elle vaut pour les deux. */
function satisfies(required: InsuranceKind, held: InsuranceKind): boolean {
  return held === 'decennale' || required === 'rc_pro'
}

function within(certificate: CertifiedActivity, now: Date): boolean {
  return now >= certificate.validFrom && now <= certificate.validUntil
}

export function activityVisibility(input: CoverageInput): ActivityVisibility[] {
  return input.declared.map((activity) => {
    if (input.legalStatus === 'blocked') {
      return { code: activity.code, visible: false, reason: 'legal_block' as const }
    }

    const forActivity = input.certified.filter((c) => c.code === activity.code)
    if (forActivity.length === 0) {
      return { code: activity.code, visible: false, reason: 'no_certificate' as const }
    }

    const required: InsuranceKind = activity.requiresDecennale ? 'decennale' : 'rc_pro'
    const rightKind = forActivity.filter((c) => satisfies(required, c.kind))
    if (rightKind.length === 0) {
      return { code: activity.code, visible: false, reason: 'wrong_insurance' as const }
    }

    const inForce = rightKind.some((c) => within(c, input.now))
    return inForce
      ? { code: activity.code, visible: true, reason: 'covered' as const }
      : { code: activity.code, visible: false, reason: 'expired' as const }
  })
}

/**
 * Une entreprise figure dans l'annuaire des qu'une activite au moins y est
 * couverte. Une fiche sans aucune activite couverte ne dit rien au demandeur et
 * affaiblit la promesse de l'annuaire.
 */
export function publiclyVisible(input: CoverageInput): boolean {
  return activityVisibility(input).some((a) => a.visible)
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/coverage.test.ts`
Expected: PASS — 12 tests

- [ ] **Step 5 : Commit**

```bash
git add src/domain/coverage.ts tests/domain/coverage.test.ts
git commit -m "feat: couverture assurantielle par activite"
```

---

## Task 3 : Le classement des avis BODACC

**Files:**
- Create: `src/domain/bodacc.ts`
- Test: `tests/domain/bodacc.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/bodacc.test.ts
import { describe, it, expect } from 'vitest'
import { classifyNotice, legalStatusFrom } from '@/domain/bodacc'

describe('classement des familles d avis', () => {
  it('bloque sur une procedure collective', () => {
    expect(classifyNotice('collective')).toBe('blocking')
  })

  it('bloque sur un retablissement professionnel et une radiation', () => {
    expect(classifyNotice('retablissement_professionnel')).toBe('blocking')
    expect(classifyNotice('radiation')).toBe('blocking')
  })

  it('ne bloque pas sur une conciliation', () => {
    // La conciliation est une demarche VOLONTAIRE et confidentielle de
    // prevention. Traiter un dirigeant qui anticipe ses difficultes comme un
    // dirigeant en liquidation punirait exactement le bon comportement.
    expect(classifyNotice('conciliation')).toBe('signal')
  })

  it('ignore les avis de gestion courante', () => {
    for (const family of ['creation', 'immatriculation', 'modification', 'vente', 'dpc', 'divers']) {
      expect(classifyNotice(family)).toBe('neutral')
    }
  })

  it('ignore une famille inconnue plutot que de bloquer', () => {
    // Bloquer sur l'inconnu rendrait toute evolution du BODACC capable de
    // suspendre des entreprises saines du jour au lendemain.
    expect(classifyNotice('famille_future')).toBe('neutral')
  })
})

describe('statut legal deduit', () => {
  it('est actif sans aucun avis', () => {
    expect(legalStatusFrom([])).toBe('active')
  })

  it('est bloque des qu un avis bloquant existe', () => {
    expect(legalStatusFrom(['dpc', 'collective'])).toBe('blocked')
  })

  it("reste actif si seuls des avis neutres ou des signaux existent", () => {
    expect(legalStatusFrom(['dpc', 'conciliation', 'modification'])).toBe('active')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/bodacc.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/bodacc.ts

/**
 * Classement des avis du BODACC.
 *
 * Les familles sont normalisees par la DILA, ce qui evite d'analyser du texte
 * libre. On classe explicitement, et tout ce qui n'est pas connu est neutre :
 * bloquer sur l'inconnu rendrait toute evolution de la nomenclature capable de
 * suspendre des entreprises saines.
 */
export type NoticeEffect = 'blocking' | 'signal' | 'neutral'

const BLOCKING = new Set(['collective', 'retablissement_professionnel', 'radiation'])

/**
 * La conciliation est une demarche volontaire et confidentielle de prevention.
 * La traiter comme une liquidation punirait le bon comportement.
 */
const SIGNAL = new Set(['conciliation'])

export function classifyNotice(family: string): NoticeEffect {
  if (BLOCKING.has(family)) return 'blocking'
  if (SIGNAL.has(family)) return 'signal'
  return 'neutral'
}

export function legalStatusFrom(families: string[]): 'active' | 'blocked' {
  return families.some((f) => classifyNotice(f) === 'blocking') ? 'blocked' : 'active'
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/bodacc.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5 : Commit**

```bash
git add src/domain/bodacc.ts tests/domain/bodacc.test.ts
git commit -m "feat: classement des avis BODACC"
```

---

## Task 4 : Les qualifications RGE

**Files:**
- Create: `src/domain/rge.ts`
- Test: `tests/domain/rge.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/rge.test.ts
import { describe, it, expect } from 'vitest'
import { activeQualifications, type RgeRow } from '@/domain/rge'

// Structure reelle du jeu ADEME, relevee sur un appel a l'API.
const row: RgeRow = {
  siret: '50769820700036',
  code_qualification: '5211D101',
  nom_qualification: 'Remplacement de chaudière gaz/fuel en logement individuel',
  domaine: 'Chaudière condensation ou micro-cogénération gaz ou fioul',
  meta_domaine: "Travaux d'efficacité énergétique",
  organisme: 'qualibat',
  nom_certificat: 'QUALIBAT-RGE',
  url_qualification: 'https://www.qualibat.com/…',
  lien_date_debut: '2024-01-24',
  lien_date_fin: '2028-03-07',
}

describe('qualifications RGE actives', () => {
  it('retient une qualification en cours de validite', () => {
    const active = activeQualifications([row], new Date('2026-08-08'))
    expect(active).toHaveLength(1)
    expect(active[0].organisation).toBe('qualibat')
    expect(active[0].validUntil).toEqual(new Date('2028-03-07'))
  })

  it('ecarte une qualification expiree', () => {
    expect(activeQualifications([row], new Date('2029-01-01'))).toEqual([])
  })

  it('ecarte une qualification pas encore entree en vigueur', () => {
    expect(activeQualifications([row], new Date('2023-01-01'))).toEqual([])
  })

  it('dedoublonne les lignes portant le meme code de qualification', () => {
    // L'API renvoie une ligne par domaine de travaux : une meme qualification
    // apparait plusieurs fois.
    expect(activeQualifications([row, { ...row, domaine: 'Autre' }], new Date('2026-08-08'))).toHaveLength(1)
  })

  it('ignore une ligne sans date de fin plutot que de la croire eternelle', () => {
    expect(activeQualifications([{ ...row, lien_date_fin: null }], new Date('2026-08-08'))).toEqual([])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/rge.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/rge.ts

/**
 * Qualifications RGE, telles que le jeu ouvert de l'ADEME les expose.
 *
 * Le RGE n'est pas un booleen : c'est une LISTE DATEE par qualification. Une
 * entreprise peut etre RGE pour le remplacement de chaudiere et pas pour
 * l'isolation. Afficher « RGE » sans dire pour quoi reproduirait exactement le
 * piege de l'assurance que ce produit pretend corriger.
 */
export interface RgeRow {
  /** La recherche de l'ADEME est en texte integral : le filtre exact en depend. */
  siret: string
  code_qualification: string
  nom_qualification: string
  domaine: string | null
  meta_domaine: string | null
  organisme: string | null
  nom_certificat: string | null
  url_qualification: string | null
  lien_date_debut: string | null
  lien_date_fin: string | null
}

export interface Qualification {
  code: string
  label: string
  organisation: string | null
  certificateUrl: string | null
  validUntil: Date
}

export function activeQualifications(rows: RgeRow[], now: Date): Qualification[] {
  const byCode = new Map<string, Qualification>()

  for (const row of rows) {
    // Sans date de fin, on ne peut rien affirmer. La croire eternelle
    // reviendrait a afficher une qualification peut-etre perimee.
    if (!row.lien_date_fin) continue

    const validUntil = new Date(row.lien_date_fin)
    const validFrom = row.lien_date_debut ? new Date(row.lien_date_debut) : new Date(0)
    if (now < validFrom || now > validUntil) continue

    // L'API renvoie une ligne par domaine de travaux : on dedoublonne.
    if (byCode.has(row.code_qualification)) continue

    byCode.set(row.code_qualification, {
      code: row.code_qualification,
      label: row.nom_qualification,
      organisation: row.organisme,
      certificateUrl: row.url_qualification,
      validUntil,
    })
  }

  return [...byCode.values()]
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/rge.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5 : Commit**

```bash
git add src/domain/rge.ts tests/domain/rge.test.ts
git commit -m "feat: qualifications RGE datees, par activite"
```

---

## Task 5 : Le schéma de vérification

**Files:**
- Create: `src/db/schema/verification.ts`, `src/db/schema/staff.ts`
- Modify: `src/db/schema/index.ts`
- Create: `supabase/migrations/9005_certificates_bucket.sql`

- [ ] **Step 1 : Écrire le schéma**

```typescript
// src/db/schema/verification.ts
import { pgTable, uuid, text, timestamp, boolean, unique, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'

/**
 * Le referentiel d'activites. C'est une DONNEE : il s'alimente par migration
 * (9004) et s'enrichit sans toucher au schema ni redeployer.
 */
export const activity = pgTable('activity', {
  code: text('code').primaryKey(),
  label: text('label').notNull(),
  family: text('family', {
    enum: ['site', 'structure', 'envelope', 'fitting', 'technical'],
  }).notNull(),
  // Renseigne activite par activite : la nomenclature contient des entrees qui
  // n'engagent pas l'article 1792 du Code civil.
  requiresDecennale: boolean('requires_decennale').notNull(),
})

/** Ce que l'entreprise declare exercer. Declaratif — la couverture, elle, se prouve. */
export const companyActivity = pgTable(
  'company_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    activityCode: text('activity_code')
      .notNull()
      .references(() => activity.code),
    declaredAt: timestamp('declared_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('company_activity_uq').on(t.companyId, t.activityCode)],
)

/**
 * Une attestation deposee par l'artisan.
 *
 * Ce que nous ne pouvons recuperer nulle part — API Entreprise nous est fermee —
 * l'artisan le fournit. Le fichier vit dans un compartiment prive ; seul son
 * chemin est ici.
 */
export const insuranceCertificate = pgTable(
  'insurance_certificate',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    kind: text('kind', { enum: ['decennale', 'rc_pro'] }).notNull(),
    storagePath: text('storage_path').notNull(),
    insurerName: text('insurer_name'),
    policyNumber: text('policy_number'),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    status: text('status', { enum: ['pending', 'validated', 'rejected'] })
      .notNull()
      .default('pending'),
    /** Motif communique a l'artisan en cas de rejet. Jamais de refus muet. */
    rejectionReason: text('rejection_reason'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('certificate_company_idx').on(t.companyId)],
)

/**
 * La correspondance entre une attestation et une activite du referentiel.
 *
 * **C'est l'acte qui engage.** Lire « Plomberie — installations sanitaires » sur
 * un PDF est facile ; decider si cela couvre la pose d'un chauffe-eau
 * thermodynamique est difficile, et c'est cette decision qu'un demandeur
 * utilisera. Elle est donc toujours humaine, et toujours tracee.
 */
export const certificateActivity = pgTable(
  'certificate_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    certificateId: uuid('certificate_id')
      .notNull()
      .references(() => insuranceCertificate.id),
    activityCode: text('activity_code')
      .notNull()
      .references(() => activity.code),
    /** Le libelle exact lu sur l'attestation, conserve tel quel. */
    sourceLabel: text('source_label').notNull(),
    confirmedBy: uuid('confirmed_by').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('certificate_activity_uq').on(t.certificateId, t.activityCode)],
)

/** Resultat date d'un controle automatique sur une source ouverte. */
export const legalCheck = pgTable(
  'legal_check',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    source: text('source', { enum: ['sirene', 'bodacc', 'rge'] }).notNull(),
    status: text('status', { enum: ['active', 'blocked'] }).notNull(),
    detail: text('detail'),
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('legal_check_company_idx').on(t.companyId, t.source)],
)

export const activityRelations = relations(activity, ({ many }) => ({
  companies: many(companyActivity),
}))

export const companyActivityRelations = relations(companyActivity, ({ one }) => ({
  company: one(company, { fields: [companyActivity.companyId], references: [company.id] }),
  activity: one(activity, { fields: [companyActivity.activityCode], references: [activity.code] }),
}))

export const insuranceCertificateRelations = relations(insuranceCertificate, ({ one, many }) => ({
  company: one(company, { fields: [insuranceCertificate.companyId], references: [company.id] }),
  activities: many(certificateActivity),
}))

export const certificateActivityRelations = relations(certificateActivity, ({ one }) => ({
  certificate: one(insuranceCertificate, {
    fields: [certificateActivity.certificateId],
    references: [insuranceCertificate.id],
  }),
  activity: one(activity, {
    fields: [certificateActivity.activityCode],
    references: [activity.code],
  }),
}))
```

- [ ] **Step 2 : Écrire le schéma des relecteurs**

```typescript
// src/db/schema/staff.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Relecteurs internes.
 *
 * Distincts de `member`, qui rattache un utilisateur a une entreprise cliente :
 * un relecteur n'appartient a aucune entreprise artisanale. Les confondre
 * donnerait a un artisan le pouvoir de valider sa propre attestation.
 */
export const staff = pgTable('staff', {
  /** Identifiant dans auth.users de Supabase. */
  userId: uuid('user_id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3 : Exporter**

Ajouter à `src/db/schema/index.ts` :

```typescript
export * from './verification'
export * from './staff'
```

- [ ] **Step 4 : Générer la migration**

Run: `pnpm drizzle-kit generate`
Expected: `supabase/migrations/0004_*.sql`, listant `activity`, `company_activity`, `insurance_certificate`, `certificate_activity`, `legal_check`, `staff`

> **Note :** le numéro généré doit rester inférieur à `9004`, qui alimente `activity`. Le préfixe `9000+` est réservé aux migrations écrites à la main — voir `supabase/MIGRATIONS.md`.

- [ ] **Step 5 : Le compartiment de dépôt**

Créer `supabase/migrations/9005_certificates_bucket.sql`, sur le modèle de `9002_signed_quotes_bucket.sql` :

```sql
-- Depot des attestations d'assurance. Compartiment PRIVE : une attestation
-- porte le numero de police et l'identite de l'assure. Elle est lue par
-- l'application avec la cle de service, jamais servie directement.

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 6 : Appliquer et vérifier**

Run: `pnpm supabase db reset`

Run: `docker exec supabase_db_Workaround psql -U postgres -d postgres -t -A -c "SELECT count(*), count(*) FILTER (WHERE requires_decennale) FROM activity;"`
Expected: le nombre d'activités transcrites, dont deux sans décennale

- [ ] **Step 7 : Commit**

```bash
git add src/db/schema supabase/migrations
git commit -m "feat: schema de verification, attestations et relecteurs"
```

---

## Task 6 : Les contrôles légaux automatiques

**Files:**
- Create: `src/services/legal-checks.ts`, `src/services/rge-lookup.ts`
- Test: `tests/services/legal-checks.test.ts`, `tests/services/legal-checks.integration.test.ts`

- [ ] **Step 1 : Écrire le test unitaire, sur réponse simulée**

```typescript
// tests/services/legal-checks.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchCollectiveProceedings } from '@/services/legal-checks'

afterEach(() => vi.restoreAllMocks())

const bodaccResponse = (families: string[]) => ({
  total_count: families.length,
  results: families.map((familleavis) => ({ familleavis, dateparution: '2026-01-01' })),
})

describe('recuperation des avis BODACC', () => {
  it('remonte les familles des avis trouves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => bodaccResponse(['collective', 'dpc']) }),
    )

    expect(await fetchCollectiveProceedings('507698207')).toEqual(['collective', 'dpc'])
  })

  it('renvoie une liste vide quand aucune annonce n existe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => bodaccResponse([]) }))
    expect(await fetchCollectiveProceedings('000000000')).toEqual([])
  })

  it('ne bloque jamais une entreprise sur une panne de source', async () => {
    // Une indisponibilite du BODACC ne doit pas suspendre des entreprises
    // saines. On leve, et l'appelant conserve le dernier controle connu.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchCollectiveProceedings('507698207')).rejects.toThrow('BODACC')
  })
})
```

- [ ] **Step 2 : Écrire le test d'intégration, sur l'API réelle**

```typescript
// tests/services/legal-checks.integration.test.ts
import { describe, it, expect } from 'vitest'
import { fetchCollectiveProceedings } from '@/services/legal-checks'
import { fetchRgeRows } from '@/services/rge-lookup'
import { activeQualifications } from '@/domain/rge'

/**
 * Ces tests appellent les vraies API ouvertes.
 *
 * Ils sont les seuls a reveler un changement de contrat cote fournisseur : en
 * M1, des fixtures ecrites a la main avaient valide un champ que l'API ne
 * renvoyait pas, et seul un appel reel l'avait montre.
 */
const SIREN = '507698207'
const SIRET = '50769820700036'

describe('BODACC, en vrai', () => {
  it('renvoie des familles normalisees et non du texte libre', async () => {
    const families = await fetchCollectiveProceedings(SIREN)
    const known = [
      'collective', 'conciliation', 'creation', 'divers', 'dpc', 'immatriculation',
      'inconnue', 'modification', 'radiation', 'retablissement_professionnel', 'vente',
    ]
    for (const family of families) expect(known).toContain(family)
  })
})

describe('ADEME RGE, en vrai', () => {
  it('renvoie les dates de validite et l organisme certificateur', async () => {
    const rows = await fetchRgeRows(SIRET)
    expect(rows.length).toBeGreaterThan(0)

    // Les trois champs sur lesquels repose l'affichage du RGE.
    expect(rows[0].lien_date_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(rows[0].code_qualification).toBeTruthy()
    expect(rows[0].organisme).toBeTruthy()

    expect(activeQualifications(rows, new Date()).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/services/legal-checks.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 4 : Implémenter**

```typescript
// src/services/legal-checks.ts
const BODACC =
  'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records'

/**
 * Avis BODACC concernant un SIREN.
 *
 * Source ouverte, sans cle ni inscription. API Entreprise, qui serait la voie
 * officielle, nous est fermee : elle est reservee aux organismes charges d'une
 * mission de service public.
 *
 * Une panne de la source **leve** plutot que de renvoyer une liste vide : une
 * liste vide serait interpretee comme « aucune procedure », et une
 * indisponibilite du BODACC suspendrait alors des entreprises saines — ou pire,
 * en blanchirait de reellement en difficulte.
 */
export async function fetchCollectiveProceedings(siren: string): Promise<string[]> {
  const url = `${BODACC}?where=${encodeURIComponent(`registre like "${siren}"`)}&select=familleavis&limit=100`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`BODACC indisponible (${response.status})`)

  const body = (await response.json()) as { results?: { familleavis: string | null }[] }
  return (body.results ?? []).map((r) => r.familleavis).filter((f): f is string => Boolean(f))
}
```

```typescript
// src/services/rge-lookup.ts
import type { RgeRow } from '@/domain/rge'

const ADEME =
  'https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines'

/** Qualifications RGE d'un etablissement. Source ouverte, 10 appels/s/IP. */
export async function fetchRgeRows(siret: string): Promise<RgeRow[]> {
  const response = await fetch(`${ADEME}?q=${encodeURIComponent(siret)}&size=100`)
  if (!response.ok) throw new Error(`ADEME indisponible (${response.status})`)

  const body = (await response.json()) as { results?: RgeRow[] }
  // La recherche plein texte peut ramener des voisins : on filtre sur le SIRET.
  return (body.results ?? []).filter((row) => row.siret === siret)
}
```

- [ ] **Step 5 : Écrire le re-contrôle d'existence légale**

La spec exige « Sirene + BODACC automatiques ». L'inscription de M1 interroge l'annuaire **une fois** ; une entreprise cessée le lendemain resterait affichée indéfiniment.

```typescript
// src/services/legal-checks.ts (suite)
import { findEstablishment } from '@/services/company-lookup'
import { db } from '@/db/client'
import { legalCheck } from '@/db/schema'
import { recordEvent } from '@/services/events'
import { legalStatusFrom } from '@/domain/bodacc'
import { sirenFromSiret } from '@/domain/vat-number'

/**
 * Rejoue les controles automatiques et enregistre leur resultat.
 *
 * Rien ici ne modifie une visibilite : elle se calcule a la lecture, a partir
 * du dernier controle enregistre. Ce service ne fait qu'ecrire des constats
 * dates — ce qui le rend incapable de faire diverger quoi que ce soit.
 *
 * Une source indisponible **n'ecrit rien**. Enregistrer « actif » parce que le
 * BODACC n'a pas repondu blanchirait une entreprise en liquidation ;
 * enregistrer « bloque » suspendrait une entreprise saine. Le dernier constat
 * connu reste en vigueur, et c'est la seule reponse honnete.
 */
export async function runLegalChecks(companyId: string, siret: string) {
  const results: { source: 'sirene' | 'bodacc'; status: 'active' | 'blocked'; detail: string }[] = []

  try {
    const establishment = await findEstablishment(siret)
    results.push({
      source: 'sirene',
      status: establishment.active ? 'active' : 'blocked',
      detail: establishment.active ? 'Établissement actif' : 'Établissement cessé au répertoire',
    })
  } catch {
    // Source indisponible : on ne conclut pas.
  }

  try {
    const families = await fetchCollectiveProceedings(sirenFromSiret(siret))
    const status = legalStatusFrom(families)
    results.push({
      source: 'bodacc',
      status,
      detail: status === 'blocked' ? `Avis bloquant : ${families.join(', ')}` : 'Aucun avis bloquant',
    })
  } catch {
    // Idem.
  }

  for (const result of results) {
    const [previous] = await db
      .select({ status: legalCheck.status })
      .from(legalCheck)
      .where(and(eq(legalCheck.companyId, companyId), eq(legalCheck.source, result.source)))
      .orderBy(desc(legalCheck.checkedAt))
      .limit(1)

    await db.insert(legalCheck).values({ companyId, ...result })

    // Seules les TRANSITIONS entrent au journal : un constat identique chaque
    // jour le noierait, et le passeport de M4 y lit des changements d'etat.
    if (previous?.status !== result.status) {
      await recordEvent({
        type: result.status === 'blocked' ? 'company.blocked' : 'company.unblocked',
        subjectType: 'company',
        subjectId: companyId,
        companyId,
        actorType: 'system',
        payload: { source: result.source, detail: result.detail },
      })
    }
  }

  return results
}
```

> **Note pour l'implémenteur :** ajoutez `and`, `desc` et `eq` aux imports de `drizzle-orm` en tête de fichier. Et branchez `runLegalChecks` sur le travail de fond quotidien de la Task 10 — c'est le même déclencheur, et le faire tourner ailleurs multiplierait les planifications sans raison.

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm vitest run tests/services/legal-checks.test.ts`
Expected: PASS — 3 tests

Run: `pnpm test:integration`
Expected: PASS — les deux API ouvertes répondent

- [ ] **Step 7 : Commit**

```bash
git add src/services/legal-checks.ts src/services/rge-lookup.ts tests/services
git commit -m "feat: controles legaux automatiques sur Sirene, BODACC et ADEME"
```

---

## Task 7 : Le dépôt d'attestation

**Files:**
- Create: `src/services/certificates.ts`
- Create: `src/app/(app)/verification/page.tsx`, `src/app/(app)/verification/actions.ts`, `src/app/(app)/verification/CertificateForm.tsx`

- [ ] **Step 1 : Écrire le service de dépôt**

```typescript
// src/services/certificates.ts
import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { certificateActivity, insuranceCertificate } from '@/db/schema'
import { createServiceSupabase } from '@/lib/supabase-server'
import { recordEvent } from '@/services/events'
import type { InsuranceKind } from '@/domain/activity'

const BUCKET = 'certificates'
const MAX_BYTES = 10 * 1024 * 1024

export interface UploadCertificate {
  companyId: string
  kind: InsuranceKind
  file: File
}

/**
 * Depose une attestation.
 *
 * Le fichier va dans un compartiment PRIVE : une attestation porte le numero de
 * police et l'identite de l'assure. Rien n'est extrait ici — l'attestation
 * arrive au statut `pending` et attend une revue humaine. C'est deliberé :
 * si un humain valide chaque attestation au demarrage, l'extraction automatique
 * n'est pas un mecanisme de justesse, c'est un accelerateur de saisie. On
 * construit d'abord ce qui doit exister.
 */
export async function uploadCertificate(input: UploadCertificate) {
  if (input.file.size === 0) throw new Error('Le fichier est vide')
  if (input.file.size > MAX_BYTES) throw new Error('Le fichier dépasse 10 Mo')
  if (input.file.type !== 'application/pdf') throw new Error('Seuls les PDF sont acceptés')

  const path = `${input.companyId}/${randomUUID()}.pdf`
  const supabase = createServiceSupabase()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await input.file.arrayBuffer(), { contentType: 'application/pdf' })

  if (error) throw new Error("Le dépôt de l'attestation a échoué")

  const [created] = await db
    .insert(insuranceCertificate)
    .values({ companyId: input.companyId, kind: input.kind, storagePath: path })
    .returning()

  await recordEvent({
    type: 'certificate.uploaded',
    subjectType: 'certificate',
    subjectId: created.id,
    companyId: input.companyId,
    actorType: 'company',
    payload: { kind: input.kind },
  })

  return created
}

/** Attestations validees d'une entreprise, avec les activites qu'elles couvrent. */
export async function validatedCertificates(companyId: string) {
  return db.query.insuranceCertificate.findMany({
    where: and(
      eq(insuranceCertificate.companyId, companyId),
      eq(insuranceCertificate.status, 'validated'),
    ),
    with: { activities: true },
    orderBy: desc(insuranceCertificate.validUntil),
  })
}
```

- [ ] **Step 2 : Écrire l'écran et l'action**

`src/app/(app)/verification/page.tsx` reprend la structure de `src/app/(app)/devis/page.tsx` — garde de session, restriction à l'entreprise courante. Il affiche :

- les activités déclarées, avec leur statut de visibilité et le motif (`activityVisibility`) ;
- les attestations déposées, avec leur statut (`pending`, `validated`, `rejected`) et le motif de rejet ;
- le formulaire de dépôt.

`actions.ts` expose `declareActivity`, `removeActivity` et `submitCertificate`. **`redirect` est appelé hors du bloc `try`** — Next signale la navigation en levant une exception, qu'un `catch` afficherait comme une erreur. Le formulaire utilise des champs contrôlés, React 19 réinitialisant les formulaires non contrôlés après une action. Ces deux pièges ont chacun coûté une correction en M2.

- [ ] **Step 3 : Vérifier le build**

Run: `pnpm build`
Expected: compilation et vérification TypeScript sans erreur

- [ ] **Step 4 : Vérifier que le compartiment est bien privé**

Run: `pnpm dev`, déposer une attestation, puis :

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:54321/storage/v1/object/public/certificates/<chemin>"
```

Expected: `400` — le compartiment est privé, comme celui des devis signés en M1

- [ ] **Step 5 : Commit**

```bash
git add src/services/certificates.ts src/app/\(app\)/verification
git commit -m "feat: depot des attestations d'assurance"
```

---

## Task 8 : La revue humaine et la correspondance

C'est l'acte qui engage. La partie la plus importante du jalon, et la moins spectaculaire.

**Files:**
- Create: `src/lib/staff-session.ts`
- Create: `src/app/(admin)/attestations/page.tsx`, `src/app/(admin)/attestations/[id]/page.tsx`, `src/app/(admin)/attestations/actions.ts`
- Test: `tests/services/certificates.test.ts`

- [ ] **Step 1 : Écrire la garde de session interne**

```typescript
// src/lib/staff-session.ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { staff } from '@/db/schema'
import { createServerSupabase } from './supabase-server'
import { SessionError } from './session'

/**
 * Garde des ecrans internes.
 *
 * Volontairement separee de `currentCompany` : un relecteur n'appartient a
 * aucune entreprise artisanale. Les confondre donnerait a un artisan le pouvoir
 * de valider sa propre attestation — ce qui reduirait a neant la valeur de la
 * verification.
 */
export async function currentStaff(): Promise<{ userId: string; email: string }> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new SessionError('Session expiree')

  const row = await db.query.staff.findFirst({ where: eq(staff.userId, user.id) })
  if (!row) throw new SessionError('Acces reserve')

  return { userId: row.userId, email: row.email }
}
```

- [ ] **Step 2 : Écrire le test de la validation**

```typescript
// tests/services/certificates.test.ts
import { describe, it, expect } from 'vitest'
import { assertReviewable, type ReviewableCertificate } from '@/services/certificates'

const pending: ReviewableCertificate = {
  status: 'pending',
  validFrom: new Date('2026-01-01'),
  validUntil: new Date('2026-12-31'),
  activityCodes: ['30'],
}

describe('conditions de validation d une attestation', () => {
  it('accepte un dossier complet', () => {
    expect(() => assertReviewable(pending)).not.toThrow()
  })

  it('refuse une validation sans aucune activite rattachee', () => {
    // Une attestation validee sans activite ne couvre rien : elle donnerait a
    // l'artisan le sentiment d'etre verifie sans rien rendre visible.
    expect(() => assertReviewable({ ...pending, activityCodes: [] })).toThrow('activité')
  })

  it('refuse une validation sans dates de validite', () => {
    expect(() => assertReviewable({ ...pending, validUntil: null })).toThrow('validité')
  })

  it('refuse une periode de validite inversee', () => {
    expect(() =>
      assertReviewable({ ...pending, validUntil: new Date('2025-01-01') }),
    ).toThrow('validité')
  })

  it('refuse de revalider une attestation deja traitee', () => {
    // La revue est un acte trace : la rejouer effacerait qui a decide quoi.
    expect(() => assertReviewable({ ...pending, status: 'validated' })).toThrow('déjà')
  })
})
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

Run: `pnpm vitest run tests/services/certificates.test.ts`
Expected: FAIL — `assertReviewable` n'existe pas

- [ ] **Step 4 : Implémenter la revue**

```typescript
// src/services/certificates.ts (suite)
import { eq } from 'drizzle-orm'
import { activity } from '@/db/schema'

export interface ReviewableCertificate {
  status: 'pending' | 'validated' | 'rejected'
  validFrom: Date | null
  validUntil: Date | null
  activityCodes: string[]
}

/** Conditions de validation. Fonction pure, testee isolement. */
export function assertReviewable(input: ReviewableCertificate): void {
  if (input.status !== 'pending') throw new Error('Cette attestation a déjà été traitée')

  if (!input.validFrom || !input.validUntil || input.validFrom >= input.validUntil) {
    throw new Error('La période de validité est incomplète ou incohérente')
  }

  if (input.activityCodes.length === 0) {
    throw new Error('Rattachez au moins une activité du référentiel')
  }
}

export interface ReviewInput {
  certificateId: string
  reviewerId: string
  insurerName: string
  policyNumber: string
  validFrom: Date
  validUntil: Date
  /** Correspondances etablies par le relecteur : activite du referentiel + libelle lu. */
  matches: { activityCode: string; sourceLabel: string }[]
}

/**
 * Valide une attestation et enregistre les correspondances.
 *
 * La correspondance entre un libelle d'attestation et une activite du
 * referentiel n'est jamais deduite : elle est etablie par un humain et tracee.
 * Lire « Plomberie — installations sanitaires » est facile ; decider si cela
 * couvre la pose d'un chauffe-eau thermodynamique engage le demandeur qui s'y
 * fiera.
 */
export async function validateCertificate(input: ReviewInput) {
  const current = await db.query.insuranceCertificate.findFirst({
    where: eq(insuranceCertificate.id, input.certificateId),
  })
  if (!current) throw new Error('Attestation introuvable')

  assertReviewable({
    status: current.status,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    activityCodes: input.matches.map((m) => m.activityCode),
  })

  // Les codes doivent exister au referentiel : une correspondance vers un code
  // inconnu produirait une couverture invisible et inexplicable.
  const known = await db.select({ code: activity.code }).from(activity)
  const codes = new Set(known.map((k) => k.code))
  for (const match of input.matches) {
    if (!codes.has(match.activityCode)) {
      throw new Error(`Activité inconnue au référentiel : ${match.activityCode}`)
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(insuranceCertificate)
      .set({
        status: 'validated',
        insurerName: input.insurerName,
        policyNumber: input.policyNumber,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        reviewedBy: input.reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(insuranceCertificate.id, input.certificateId))

    await tx.insert(certificateActivity).values(
      input.matches.map((match) => ({
        certificateId: input.certificateId,
        activityCode: match.activityCode,
        sourceLabel: match.sourceLabel,
        confirmedBy: input.reviewerId,
      })),
    )
  })

  await recordEvent({
    type: 'certificate.validated',
    subjectType: 'certificate',
    subjectId: input.certificateId,
    companyId: current.companyId,
    actorType: 'system',
    actorId: input.reviewerId,
    payload: {
      activities: input.matches.map((m) => m.activityCode),
      validUntil: input.validUntil.toISOString(),
    },
  })
}

/** Rejette une attestation. Le motif est communique — jamais de refus muet. */
export async function rejectCertificate(certificateId: string, reviewerId: string, reason: string) {
  if (!reason.trim()) throw new Error('Un motif de rejet est obligatoire')

  const current = await db.query.insuranceCertificate.findFirst({
    where: eq(insuranceCertificate.id, certificateId),
  })
  if (!current) throw new Error('Attestation introuvable')
  if (current.status !== 'pending') throw new Error('Cette attestation a déjà été traitée')

  await db
    .update(insuranceCertificate)
    .set({ status: 'rejected', rejectionReason: reason, reviewedBy: reviewerId, reviewedAt: new Date() })
    .where(eq(insuranceCertificate.id, certificateId))

  await recordEvent({
    type: 'certificate.rejected',
    subjectType: 'certificate',
    subjectId: certificateId,
    companyId: current.companyId,
    actorType: 'system',
    actorId: reviewerId,
    payload: { reason },
  })
}
```

- [ ] **Step 5 : Écrire les écrans de revue**

`src/app/(admin)/attestations/page.tsx` — la file : attestations `pending`, la plus ancienne en premier, gardée par `currentStaff`.

`src/app/(admin)/attestations/[id]/page.tsx` — l'écran de revue. Il affiche le PDF via une URL signée de courte durée (`createSignedUrl`, 5 minutes — le compartiment est privé), et un formulaire portant : assureur, numéro de police, dates, et **une ligne par correspondance** — le libellé lu sur l'attestation, et l'activité du référentiel à laquelle il correspond.

- [ ] **Step 6 : Lancer les tests et le build**

Run: `pnpm vitest run tests/services/certificates.test.ts && pnpm build`
Expected: PASS et build sans erreur

- [ ] **Step 7 : Commit**

```bash
git add src/lib/staff-session.ts src/services/certificates.ts src/app/\(admin\) tests/services/certificates.test.ts
git commit -m "feat: revue humaine des attestations et correspondance tracee"
```

---

## Task 9 : Le calcul de la visibilité

**Files:**
- Create: `src/services/visibility.ts`
- Test: `tests/services/visibility.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```typescript
// tests/services/visibility.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, companyActivity } from '@/db/schema'
import { companyCoverage } from '@/services/visibility'

const COMPANY = randomUUID()

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
    legalName: 'Entreprise de test',
  })
  await db.insert(companyActivity).values({ companyId: COMPANY, activityCode: '30' })
})

afterAll(async () => {
  await connection.end()
})

describe('couverture d une entreprise', () => {
  it('masque une activite declaree sans attestation validee', async () => {
    const coverage = await companyCoverage(COMPANY, new Date())

    expect(coverage.activities).toEqual([
      { code: '30', visible: false, reason: 'no_certificate' },
    ])
    expect(coverage.isPublic).toBe(false)
  })

  it('ne stocke aucun drapeau de visibilite en base', async () => {
    // La visibilite se calcule a la lecture. Un drapeau stocke deriverait de la
    // verite des le lendemain de l'expiration d'une attestation.
    const columns = await db.execute<{ column_name: string }>(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'company_activity'`,
    )
    expect(columns.map((c) => c.column_name)).not.toContain('visible')
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `pnpm vitest run tests/services/visibility.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/services/visibility.ts
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, companyActivity, insuranceCertificate, legalCheck } from '@/db/schema'
import { activityVisibility, publiclyVisible, type CoverageInput } from '@/domain/coverage'

/**
 * Assemble l'etat de couverture d'une entreprise.
 *
 * **Rien n'est stocke.** Un drapeau `visible` en base deriverait de la verite
 * des le lendemain de l'expiration d'une attestation : l'entreprise resterait
 * affichee jusqu'a ce qu'un travail de fond passe. C'est la meme regle que le
 * reste a facturer de M2 — un solde stocke finit toujours par mentir.
 */
export async function companyCoverage(companyId: string, now: Date) {
  const declared = await db
    .select({ code: activity.code, requiresDecennale: activity.requiresDecennale })
    .from(companyActivity)
    .innerJoin(activity, eq(companyActivity.activityCode, activity.code))
    .where(eq(companyActivity.companyId, companyId))
    .orderBy(activity.code)

  const certificates = await db.query.insuranceCertificate.findMany({
    where: and(
      eq(insuranceCertificate.companyId, companyId),
      eq(insuranceCertificate.status, 'validated'),
    ),
    with: { activities: true },
  })

  const [lastCheck] = await db
    .select({ status: legalCheck.status })
    .from(legalCheck)
    .where(and(eq(legalCheck.companyId, companyId), eq(legalCheck.source, 'bodacc')))
    .orderBy(desc(legalCheck.checkedAt))
    .limit(1)

  const input: CoverageInput = {
    declared,
    certified: certificates.flatMap((certificate) =>
      certificate.activities.map((link) => ({
        code: link.activityCode,
        kind: certificate.kind,
        validFrom: certificate.validFrom!,
        validUntil: certificate.validUntil!,
      })),
    ),
    // Sans controle enregistre, on ne bloque pas : bloquer par defaut
    // suspendrait toute entreprise dont le controle n'a pas encore tourne.
    legalStatus: lastCheck?.status === 'blocked' ? 'blocked' : 'active',
    now,
  }

  return {
    activities: activityVisibility(input),
    isPublic: publiclyVisible(input),
  }
}
```

- [ ] **Step 4 : Lancer le test**

Run: `pnpm vitest run tests/services/visibility.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 5 : Commit**

```bash
git add src/services/visibility.ts tests/services/visibility.test.ts
git commit -m "feat: calcul de la visibilite, jamais stocke"
```

---

## Task 10 : Les garanties de l'AIPD

Sans elles, le traitement est illicite. Ce ne sont pas des attentions : le retrait automatique d'une activité coupe l'artisan de l'accès aux demandeurs, ce qui relève de l'article 22.

**Files:**
- Create: `src/domain/expiry.ts`, `src/app/api/cron/echeances/route.ts`
- Modify: `src/services/visibility.ts`
- Test: `tests/domain/expiry.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/expiry.test.ts
import { describe, it, expect } from 'vitest'
import { noticesDue, NOTICE_DAYS } from '@/domain/expiry'

const validUntil = new Date('2026-12-31T00:00:00Z')

describe('preavis d echeance', () => {
  it('previent a J-60, J-30 et J-7', () => {
    expect(NOTICE_DAYS).toEqual([60, 30, 7])
  })

  it('declenche le preavis le jour exact', () => {
    expect(noticesDue(validUntil, new Date('2026-11-01T09:00:00Z'), [])).toEqual([60])
  })

  it('ne renvoie rien un jour sans echeance', () => {
    expect(noticesDue(validUntil, new Date('2026-11-02T09:00:00Z'), [])).toEqual([])
  })

  it('ne previent jamais deux fois pour le meme palier', () => {
    // Un artisan prevenu trois fois du meme palier cesse de lire les
    // notifications, et manque celle qui comptait.
    expect(noticesDue(validUntil, new Date('2026-11-01T09:00:00Z'), [60])).toEqual([])
  })

  it('rattrape un palier manque plutot que de le laisser passer', () => {
    // Si le travail de fond n'a pas tourne pendant trois jours, le preavis doit
    // partir en retard — jamais etre saute.
    expect(noticesDue(validUntil, new Date('2026-11-04T09:00:00Z'), [])).toEqual([60])
  })

  it('ne previent plus une fois l echeance passee', () => {
    expect(noticesDue(validUntil, new Date('2027-01-05T09:00:00Z'), [60, 30, 7])).toEqual([])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/expiry.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/expiry.ts

/**
 * Preavis avant expiration d'une attestation.
 *
 * Impose par l'article 22.3 du RGPD : le retrait automatique d'une activite de
 * la vitrine prive l'artisan de l'acces aux demandeurs. Une suspension muette
 * serait illicite — et brutale.
 */
export const NOTICE_DAYS = [60, 30, 7] as const

const DAY = 86_400_000

export function noticesDue(validUntil: Date, now: Date, alreadySent: number[]): number[] {
  const remaining = Math.ceil((validUntil.getTime() - now.getTime()) / DAY)
  if (remaining < 0) return []

  // Le plus grand palier encore non envoye et deja atteint. Un palier manque —
  // le travail de fond n'a pas tourne — part en retard plutot que d'etre saute.
  const due = NOTICE_DAYS.filter((day) => remaining <= day && !alreadySent.includes(day))

  return due.length > 0 ? [Math.max(...due)] : []
}
```

- [ ] **Step 4 : Écrire le travail de fond**

```typescript
// src/app/api/cron/echeances/route.ts
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, insuranceCertificate, event } from '@/db/schema'
import { noticesDue } from '@/domain/expiry'
import { recordEvent } from '@/services/events'
import { runLegalChecks } from '@/services/legal-checks'
import { sendRawMail } from '@/services/email'

export const runtime = 'nodejs'

/**
 * Preavis d'echeance des attestations.
 *
 * Ce travail de fond ne modifie AUCUN etat de visibilite : la visibilite se
 * calcule a la lecture. Il ne fait que prevenir — c'est sa seule raison d'etre,
 * et c'est ce qui le rend incapable de faire diverger quoi que ce soit.
 */
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Non autorisé', { status: 401 })
  }

  const now = new Date()
  const certificates = await db.query.insuranceCertificate.findMany({
    where: and(
      eq(insuranceCertificate.status, 'validated'),
      isNotNull(insuranceCertificate.validUntil),
    ),
    with: { company: true },
  })

  let sent = 0

  for (const certificate of certificates) {
    const history = await db
      .select({ payload: event.payload })
      .from(event)
      .where(and(eq(event.subjectId, certificate.id), eq(event.type, 'certificate.expiring')))

    const alreadySent = history.map((h) => Number((h.payload as { day: number }).day))
    const [day] = noticesDue(certificate.validUntil!, now, alreadySent)
    if (day === undefined) continue

    const address = certificate.company.email
    if (address) {
      await sendRawMail({
        to: address,
        subject: `Votre attestation d’assurance expire dans ${day} jours`,
        // Expliquer QUOI et POURQUOI : l'article 22.3 interdit la suspension
        // muette, et une notification sans consequence enoncee n'est pas lue.
        text: [
          `Votre attestation ${certificate.kind === 'decennale' ? 'de garantie décennale' : 'de RC professionnelle'} expire le ${certificate.validUntil!.toLocaleDateString('fr-FR')}.`,
          '',
          'Sans nouvelle attestation, les activités qu’elle couvre disparaîtront de votre page publique à cette date. Votre outil de devis et de facturation, lui, reste inchangé.',
          '',
          'Déposez votre nouvelle attestation : ' + `${process.env.NEXT_PUBLIC_APP_URL}/verification`,
          '',
          'Si vous estimez ce retrait injustifié, répondez à ce message : une personne réexaminera votre dossier.',
        ].join('\n'),
      })
    }

    await recordEvent({
      type: 'certificate.expiring',
      subjectType: 'certificate',
      subjectId: certificate.id,
      companyId: certificate.companyId,
      actorType: 'system',
      payload: { day, validUntil: certificate.validUntil!.toISOString() },
    })

    sent++
  }

  // Les controles legaux tournent au meme rythme et au meme declencheur :
  // multiplier les planifications multiplierait les facons de tomber en panne.
  const companies = await db.select({ id: company.id, siret: company.siret }).from(company)
  for (const row of companies) await runLegalChecks(row.id, row.siret)

  return Response.json({ checked: certificates.length, sent, companies: companies.length })
}
```

- [ ] **Step 5 : Déclarer la planification**

Créer `vercel.json` :

```json
{
  "crons": [{ "path": "/api/cron/echeances", "schedule": "0 7 * * *" }]
}
```

Ajouter `CRON_SECRET` à `.env.example`.

- [ ] **Step 6 : Lancer les tests et vérifier le travail de fond**

Run: `pnpm vitest run tests/domain/expiry.test.ts`
Expected: PASS — 6 tests

Run, avec `pnpm dev` lancé :

```bash
curl -s -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" http://localhost:3000/api/cron/echeances
```

Expected: `{"checked":N,"sent":M,"companies":P}` — et un `401` sans l'en-tête

- [ ] **Step 7 : Commit**

```bash
git add src/domain/expiry.ts src/app/api tests/domain/expiry.test.ts vercel.json .env.example
git commit -m "feat: preavis d'echeance et garanties de l'article 22.3"
```

---

## Task 11 : La page publique

C'est ce qu'un demandeur voit, et c'est là que la différenciation devient visible.

**Files:**
- Create: `src/domain/slug.ts`, `src/app/artisan/[slug]/page.tsx`
- Test: `tests/domain/slug.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/slug.test.ts
import { describe, it, expect } from 'vitest'
import { companySlug, sirenFromSlug } from '@/domain/slug'

describe('adresse publique d une entreprise', () => {
  it('compose un identifiant lisible a partir du nom et du SIREN', () => {
    expect(companySlug('BD PLOMBERIE', '50769820700036')).toBe('bd-plomberie-507698207')
  })

  it('translittere les diacritiques', () => {
    expect(companySlug('Menuiserie Décorée', '50769820700036')).toBe(
      'menuiserie-decoree-507698207',
    )
  })

  it('retire la ponctuation et les doublons de tirets', () => {
    expect(companySlug('SARL  DUPONT & FILS (BTP)', '50769820700036')).toBe(
      'sarl-dupont-fils-btp-507698207',
    )
  })

  it('retrouve le SIREN depuis l identifiant', () => {
    // C'est le SIREN qui identifie, jamais le nom : une entreprise qui change
    // de denomination ne doit pas perdre son referencement.
    expect(sirenFromSlug('bd-plomberie-507698207')).toBe('507698207')
  })

  it('rejette un identifiant sans SIREN valide', () => {
    expect(sirenFromSlug('bd-plomberie')).toBeNull()
    expect(sirenFromSlug('bd-plomberie-12345')).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/slug.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/slug.ts
import { sirenFromSiret } from './vat-number'

/**
 * Adresse publique d'une entreprise : « bd-plomberie-507698207 ».
 *
 * Le nom est la pour l'humain et pour le referencement ; **c'est le SIREN qui
 * identifie**. Une entreprise qui change de denomination garde donc sa page,
 * son referencement et les liens qui pointent vers elle.
 */
// Les marques diacritiques sont visees par propriete Unicode plutot qu'en
// clair : ecrites litteralement elles sont invisibles en source, et n'importe
// quelle reecriture du fichier les fait disparaitre. Le piege s'est presente
// deux fois en M1.
const DIACRITICS = /\p{M}/gu
const NON_WORD = /[^a-z0-9]+/g

export function companySlug(legalName: string, siret: string): string {
  const name = legalName
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NON_WORD, '-')
    .replace(/^-|-$/g, '')

  return `${name}-${sirenFromSiret(siret)}`
}

export function sirenFromSlug(slug: string): string | null {
  const match = /-(\d{9})$/.exec(slug)
  return match ? match[1] : null
}
```

- [ ] **Step 4 : Écrire la page publique**

`src/app/artisan/[slug]/page.tsx` — sans session, sur le modèle de `src/app/d/[token]/page.tsx`.

Elle charge l'entreprise par le SIREN extrait de l'identifiant, appelle `companyCoverage`, et :

- **renvoie `notFound()` si `isPublic` est faux** — une entreprise sans aucune activité couverte n'a pas de page ;
- affiche l'identité, l'ancienneté et les mentions d'assurance ;
- affiche **uniquement les activités visibles**, avec le type d'assurance qui les couvre ;
- affiche les qualifications RGE actives, **avec leur objet et leur date de fin** — jamais un « RGE » nu ;
- porte les métadonnées de référencement (`generateMetadata`), puisque l'objet du jalon est d'être trouvé sur Google ;
- **n'affiche aucune métrique** : elles arrivent en M4.

> **Le filtrage est porté par la requête, pas par l'affichage.** L'AIPD l'exige nommément : *« les exclusions sont portées par la requête de publication elle-même, jamais par un filtre d'affichage »*. Un filtre en surface s'oublie au premier refactor ; une condition dans la source de données ne s'oublie pas.

- [ ] **Step 5 : Lancer les tests et le build**

Run: `pnpm vitest run tests/domain/slug.test.ts && pnpm build`
Expected: PASS — 5 tests, build sans erreur

- [ ] **Step 6 : Commit**

```bash
git add src/domain/slug.ts src/app/artisan tests/domain/slug.test.ts
git commit -m "feat: page publique de l'artisan"
```

---

## Task 12 : Le parcours de bout en bout

**Files:**
- Create: `tests/e2e/verification-journey.spec.ts`
- Modify: `tests/e2e/fixtures.ts`, `supabase/seed.sql`

- [ ] **Step 1 : Ajouter un relecteur au jeu de données**

Dans `supabase/seed.sql`, l'entreprise de démonstration déclare deux activités — `30` (plomberie) et `34` (électricité) — pour que la **suspension granulaire** soit vérifiable à la main : une couverte, une non couverte.

Le relecteur, lui, ne peut pas être créé par le jeu de données : `staff.userId` référence un compte `auth.users` qui n'existe qu'après une connexion. Deux fonctions s'ajoutent donc à `tests/e2e/fixtures.ts`, sur le modèle de `signedQuoteFor` écrite en M2 — mêmes imports différés, même raison :

- `companyWithActivities(email, codes)` — crée l'entreprise avec ses mentions complètes, rattache le compte connecté comme `member`, déclare les activités demandées, et renvoie `{ id, slug }` ;
- `makeStaff(email)` — insère une ligne `staff` pour le compte connecté.

Rappel du piège de M2 : `@/db/schema` n'expose ses tables que sous `default` dans le transpilage CommonJS de Playwright, un module en réexport pur ne laissant rien deviner statiquement.

- [ ] **Step 2 : Écrire le test**

```typescript
// tests/e2e/verification-journey.spec.ts
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'
import { companyWithActivities, makeStaff } from './fixtures'

/**
 * Le parcours de M3 : d'une activite declaree a une page publique.
 *
 * Il verifie ce que les tests unitaires ne peuvent pas voir — que le depot, la
 * revue interne, le calcul de visibilite et la page publique tiennent ensemble.
 */
const ARTISAN = 'artisan-m3@test.local'
const REVIEWER = 'relecteur-m3@test.local'

test('de l’attestation déposée à la page publique', async ({ page, context }) => {
  await clearMailbox()

  await test.step('connexion de l’artisan', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  // Deux activites declarees : plomberie et electricite. Une seule sera couverte.
  const company = await companyWithActivities(ARTISAN, ['30', '34'])

  await test.step('aucune activité n’est visible avant vérification', async () => {
    await page.goto('/verification')
    await expect(page.getByTestId('statut-30')).toHaveText('Attestation manquante')
    await expect(page.getByTestId('statut-34')).toHaveText('Attestation manquante')
  })

  await test.step('la page publique n’existe pas encore', async () => {
    const anonymous = await context.newPage()
    const response = await anonymous.goto(`/artisan/${company.slug}`)
    expect(response?.status()).toBe(404)
    await anonymous.close()
  })

  await test.step('déposer une attestation', async () => {
    await page.getByLabel('Type d’assurance').selectOption('decennale')
    await page.getByLabel('Attestation (PDF)').setInputFiles('tests/e2e/fixtures/attestation.pdf')
    await page.getByRole('button', { name: 'Déposer' }).click()

    await expect(page.getByTestId('statut-attestation')).toHaveText('En cours de vérification')
  })

  const reviewer = await context.newPage()

  await test.step('un relecteur interne établit la correspondance', async () => {
    await reviewer.goto('/connexion')
    await reviewer.getByLabel('E-mail').fill(REVIEWER)
    await reviewer.getByRole('button', { name: 'Recevoir le lien' }).click()
    await reviewer.goto(await magicLinkFor(REVIEWER))
    await makeStaff(REVIEWER)

    await reviewer.goto('/attestations')
    await reviewer.getByRole('link', { name: /Entreprise de test/ }).click()

    await reviewer.getByLabel('Assureur').fill('SMABTP')
    await reviewer.getByLabel('Numéro de police').fill('D-2026-000123')
    await reviewer.getByLabel('Valide du').fill('2026-01-01')
    await reviewer.getByLabel('Valide jusqu’au').fill('2026-12-31')

    // La correspondance : le libelle lu, et l'activite du referentiel.
    await reviewer.getByLabel('Libellé lu sur l’attestation').fill('Plomberie - installations sanitaires')
    await reviewer.getByLabel('Activité du référentiel').selectOption('30')

    await reviewer.getByRole('button', { name: 'Valider l’attestation' }).click()
    await expect(reviewer.getByRole('status')).toContainText('validée')
  })

  await test.step('la suspension est granulaire', async () => {
    await page.reload()
    await expect(page.getByTestId('statut-30')).toHaveText('Couverte')
    // Le point que le marche ne fait pas : l'electricite reste masquee.
    await expect(page.getByTestId('statut-34')).toHaveText('Attestation manquante')
  })

  await test.step('la page publique n’affiche que ce qui est couvert', async () => {
    const anonymous = await context.newPage()
    await anonymous.goto(`/artisan/${company.slug}`)

    await expect(anonymous.getByText('Plomberie — installations sanitaires')).toBeVisible()
    await expect(anonymous.getByText('Électricité')).toHaveCount(0)
    await expect(anonymous.getByText('SMABTP')).toBeVisible()
    // Les metriques arrivent en M4 : rien ici.
    await expect(anonymous.getByTestId('passeport-metriques')).toHaveCount(0)
    await anonymous.close()
  })

  await test.step('un artisan ne peut pas valider sa propre attestation', async () => {
    // Confondre `member` et `staff` donnerait a l'artisan le pouvoir de se
    // verifier lui-meme, ce qui reduirait a neant la valeur du label.
    const response = await page.goto('/attestations')
    expect(response?.status()).toBe(404)
  })
})
```

- [ ] **Step 3 : Lancer le test**

Run: `pnpm test:e2e`
Expected: PASS — les trois parcours, M1, M2 et M3

- [ ] **Step 4 : Vérifier le journal**

Run: `docker exec supabase_db_Workaround psql -U postgres -d postgres -t -A -c "SELECT type FROM event WHERE type LIKE 'certificate%' ORDER BY occurred_at;"`
Expected: `certificate.uploaded`, `certificate.validated`

Ces événements sont la matière première du passeport de M4 : sans eux, l'historique de vérification n'existe pas.

- [ ] **Step 5 : Commit**

```bash
git add tests/e2e supabase/seed.sql
git commit -m "test: parcours de verification, de l'attestation a la page publique"
```

---

## Ce que M3 ne fait pas

Ces absences sont volontaires. À vérifier avant de déclarer le jalon terminé.

- **Aucune extraction automatique des attestations.** Décidée, mais reportée : si un humain valide chaque attestation au démarrage, l'extraction n'est pas un mécanisme de justesse, c'est un accélérateur de saisie. Elle s'écrira quand vingt attestations réelles auront été vues — pas contre une variété imaginée.
- **Aucune attestation de vigilance URSSAF.** API Entreprise nous est fermée ; la voie par code de sécurité existe mais ses conditions d'accès restent à confirmer. Hors chemin critique : le différenciateur est la couverture assurantielle.
- **Aucune métrique.** M4. Le journal les alimente déjà.
- **Aucune habilitation de niveau 3** — fluides frigorigènes, PGN/PGP, amiante SS3/SS4. Elles n'ont pas de source ouverte et supposent le même circuit de dépôt et de revue que l'assurance. Le circuit construit ici les accueillera sans refonte.
- **Aucun annuaire, aucune recherche.** M3 produit des pages publiques individuelles, trouvables par un moteur de recherche. La recherche interne suppose une marketplace : c'est P2.
- **Aucune procédure de contestation d'une métrique.** M4, où les métriques existent — voir l'AIPD.
