import { test, expect, type Page } from '@playwright/test'
import { clearMailbox, mailSubjects } from './helpers'

/**
 * Le parcours du demandeur : d'un SIRET saisi a un mail parti chez l'artisan.
 *
 * Les 972 tests unitaires et de services couvrent chaque piece. Celui-ci
 * couvre ce qu'aucun d'eux ne peut voir : que l'aiguillage de `lookupCompany`,
 * la page de verification, la server action et le mailer tiennent ensemble
 * dans un navigateur, avec la vraie base et le vrai collecteur de mail.
 *
 * Il protege surtout la regle centrale du parcours, celle qui n'a de sens que
 * sur l'ecran assemble : **la page ne peut qu'identifier ou alerter, jamais
 * rassurer**. Un signal positif ajoute par un composant, un jeton de couleur
 * ou une phrase de courtoisie ne se verrait dans aucun test de service — il se
 * verrait ici.
 */

/**
 * Cle de Luhn valide, absent de `supabase/seed.sql` et de tous les autres
 * parcours (`grep` fait). Le SIREN 987 654 321 n'est attribue a personne : le
 * repertoire public repondra « inconnu », et jamais une identite reelle qui
 * changerait sous nos pieds.
 */
const UNKNOWN_SIRET = '98765432100007'

/** Le meme numero, cle fausse. */
const BAD_KEY_SIRET = '98765432100013'

/**
 * Une entreprise du seed, donc inscrite chez nous. Elle sert a une seule
 * chose : verifier qu'elle lit exactement le meme ecran qu'un inconnu.
 */
const MEMBER_SIRET = '50769820700036'

const REQUESTER_NAME = 'Camille'
const REQUESTER_EMAIL = 'demandeur-verification@test.local'
const ARTISAN_EMAIL = 'artisan-verification@test.local'

/**
 * Le vocabulaire qui rassure, et que cette page n'a pas le droit d'employer.
 *
 * **Formulation deliberee.** Une comparaison mot a mot du texte de la page
 * serait fausse le jour ou une virgule bouge ; une simple absence de coche
 * verte ne prouverait rien, puisqu'un « entreprise active » en texte brut
 * rassure tout autant. Le test tient donc les deux bouts :
 *
 * — cette liste ne contient QUE des termes dont l'apparition serait, en soi,
 *   la regression : un statut administratif favorable (`actif`, `en règle`,
 *   `à jour`), un label repris d'un tiers (`RGE`, `certifié`, `qualifié`), ou
 *   un jugement (`fiable`, `de confiance`, `score`, `note`). Aucun n'est un
 *   mot que la page pourrait employer innocemment ;
 * — les mots que la page emploie legitimement — `assurance`, `garantie`,
 *   `vérifiée`, `activité` — en sont volontairement absents : les y mettre
 *   ferait echouer le test sur du texte juste, et la premiere reaction serait
 *   de retoucher la page.
 *
 * Les bornes `\b` evitent les faux positifs par sous-chaine (`actif` dans
 * `actifs`, `note` dans `notez`) ; les racines sans borne finale — `certifi`,
 * `qualifi` — attrapent au contraire toutes les flexions.
 */
const REASSURING = [
  /\bRGE\b/,
  /\bactif\b/i,
  /\bactive\b/i,
  /certifi/i,
  /qualifi/i,
  /\bconforme/i,
  /à jour/i,
  /en règle/i,
  /fiable/i,
  /de confiance/i,
  /\bscore\b/i,
  /\bnote\b/i,
]

/**
 * Le vocabulaire de l'appartenance, interdit dans les deux sens.
 *
 * Dire « cette entreprise n'est pas inscrite chez nous » revelerait une
 * appartenance a n'importe quel tiers muni d'un SIRET. Le dire a l'envers
 * aussi. C'est ce que `tests/services/verification-indistinction.test.ts`
 * verrouille cote service ; ici on le verifie sur l'ecran rendu.
 */
const MEMBERSHIP = [/inscrit/i, /adhér/i, /notre client/i, /chez nous/i, /membre/i]

async function pageText(page: Page): Promise<string> {
  return (await page.locator('body').innerText()).replace(/ /g, ' ')
}

test('de la recherche au mail adressé à l’entreprise', async ({ page }) => {
  await clearMailbox()

  await test.step('le SIRET saisi mène à la page de vérification', async () => {
    await page.goto('/verifier')
    await page.getByLabel('SIRET de l’entreprise').fill(UNKNOWN_SIRET)
    await page.getByRole('button', { name: 'Vérifier' }).click()

    await expect(page).toHaveURL(new RegExp(`/verification/${UNKNOWN_SIRET}$`))
  })

  await test.step('le verdict dit ce que nous ne pouvons pas affirmer', async () => {
    // Le titre de niveau 1 est le verdict lui-meme, et non le nom de
    // l'entreprise : la page n'affirme rien a son sujet.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Nous ne pouvons rien affirmer sur l’assurance de cette entreprise.',
    )
    await expect(page.getByText(`SIRET ${UNKNOWN_SIRET}`)).toBeVisible()

    /*
      L'ordre des blocs EST le message : le constat d'abord, les deux chemins
      ensuite. Un formulaire remonte au-dessus du verdict se lirait comme une
      page de contact, et le constat comme une note de bas de page.
    */
    const headings = await page.getByRole('heading').allInnerTexts()
    expect(headings.slice(0, 3)).toEqual([
      'Nous ne pouvons rien affirmer sur l’assurance de cette entreprise.',
      'Demandez-lui son attestation',
      'Ou demandez-lui vous-même',
    ])
  })

  await test.step('la demande part', async () => {
    await page.getByLabel('Votre prénom').fill(REQUESTER_NAME)
    await page.getByLabel('Votre e-mail').fill(REQUESTER_EMAIL)
    await page.getByLabel('E-mail de l’entreprise').fill(ARTISAN_EMAIL)

    // Cochee par defaut : c'est une decision du produit, pas un detail de rendu.
    await expect(
      page.getByLabel('Prévenez-moi dès que son attestation est vérifiée'),
    ).toBeChecked()

    await page.getByRole('button', { name: 'Demander l’attestation' }).click()

    /*
      La confirmation ne promet ni un envoi ni une reponse : elle enonce notre
      regle de contact, qui reste vraie meme quand une garde a refuse la
      demande en silence. C'est cette phrase-la, et pas une autre, qui rend
      l'indistinction tenable.
    */
    const status = page.getByRole('status')
    await expect(status).toContainText('Nous nous en occupons.')
    await expect(status).toContainText('n’est pas tenue de nous répondre')
    await expect(page.getByRole('button', { name: 'Demander l’attestation' })).toHaveCount(0)
  })

  await test.step('l’artisan et le demandeur reçoivent chacun leur message', async () => {
    await expect
      .poll(() => mailSubjects(), { timeout: 15_000 })
      .toContain(`${REQUESTER_NAME} vous demande votre attestation décennale`)

    expect(await mailSubjects()).toContain('Votre demande d’attestation est partie')
  })
})

test('la page ne rassure jamais, et ne dit pas qui est inscrit chez nous', async ({ page }) => {
  await page.goto(`/verification/${UNKNOWN_SIRET}`)
  const text = await pageText(page)

  for (const forbidden of REASSURING) {
    expect(text, `« ${forbidden.source} » ne doit pas apparaître`).not.toMatch(forbidden)
  }
  for (const forbidden of MEMBERSHIP) {
    expect(text, `« ${forbidden.source} » ne doit pas apparaître`).not.toMatch(forbidden)
  }

  /*
    Le versant structurel du meme interdit. `verified` est le seul jeton vert
    du systeme de design — celui de `Notice tone="verified"` et des badges de
    couverture. Sa presence ici serait la regression, quel que soit le texte
    qui l'accompagne : c'est le chemin par lequel elle arriverait, puisqu'il
    ne demande d'ecrire aucun mot.
  */
  await expect(page.locator('[class*="verified"]')).toHaveCount(0)

  // La mention de pied de page des documents emis se lirait comme une caution :
  // la page prend `variant="page"` precisement pour ne pas la porter.
  expect(text).not.toContain('Document émis avec D’équerre')

  // La mise en garde finale, elle, doit y etre : sans elle, une page sans
  // alerte se lit comme une page rassurante.
  await expect(
    page.getByText('L’absence d’alerte ne signifie pas que tout va bien.'),
  ).toBeVisible()
})

test('un inscrit sans couverture lit le même écran qu’un inconnu', async ({ page }) => {
  await page.goto(`/verification/${MEMBER_SIRET}`)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Nous ne pouvons rien affirmer sur l’assurance de cette entreprise.',
  )

  const text = await pageText(page)
  for (const forbidden of MEMBERSHIP) {
    expect(text, `« ${forbidden.source} » ne doit pas apparaître`).not.toMatch(forbidden)
  }
  await expect(page.locator('[class*="verified"]')).toHaveCount(0)
})

test('la page n’est pas indexable', async ({ page, request }) => {
  await page.goto(`/verification/${UNKNOWN_SIRET}`)

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  // Le titre d'onglet ne nomme pas l'entreprise : il partirait dans
  // l'historique et dans tout apercu de lien.
  await expect(page).toHaveTitle('Vérification — D’équerre')

  // `robots.txt` redit la meme chose pour les robots qui ne lisent que lui.
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('/verification/')
})

test('un SIRET à clé de Luhn fausse ne mène nulle part', async ({ page }) => {
  await test.step('le formulaire le refuse sans quitter la page', async () => {
    await page.goto('/verifier')
    await page.getByLabel('SIRET de l’entreprise').fill(BAD_KEY_SIRET)
    await page.getByRole('button', { name: 'Vérifier' }).click()

    await expect(page.getByText('Ce SIRET n’existe pas : vérifiez les chiffres.')).toBeVisible()
    await expect(page).toHaveURL(/\/verifier$/)
  })

  await test.step('l’URL forcée à la main rend un 404', async () => {
    // Le garde-fou de `page.tsx`, avant tout appel reseau. Une page servie ici
    // publierait une fiche sur un numero qui n'appartient a personne.
    const response = await page.goto(`/verification/${BAD_KEY_SIRET}`)
    expect(response?.status()).toBe(404)
  })
})

/**
 * Le presse-papiers vaut son cout, contrairement a ce qu'on pourrait croire.
 *
 * Ce n'est pas la copie qu'on eprouve — `writeText` est du navigateur — mais
 * l'enchainement que `CopyMessage` a construit a la main : la copie part dans
 * la tache du clic, le libelle bascule, et l'intention n'est enregistree
 * qu'ensuite. Aucun test unitaire ne peut voir cet ordre, et c'est justement
 * lui qu'une refactorisation « propre » — un `await` de la server action avant
 * la copie — casserait en silence, sans qu'aucun ecran ne change.
 *
 * La permission est accordee explicitement : sans elle, Chromium refuse et le
 * composant afficherait sa retombee.
 */
test('le message à copier porte le lien de cette page', async ({ browser }) => {
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await context.newPage()
  await page.goto(`/verification/${UNKNOWN_SIRET}`)

  await page.getByRole('button', { name: 'Copier le message' }).click()

  await expect(page.getByRole('button', { name: 'Message copié' })).toBeVisible()
  await expect(page.getByTestId('copie-refusee')).toHaveCount(0)

  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('attestation de garantie décennale')
  expect(copied).toContain(`/verification/${UNKNOWN_SIRET}`)

  // Le message est celui du demandeur, pas le notre : il ne nous nomme pas.
  expect(copied).not.toMatch(/D’équerre/)

  await context.close()
})
