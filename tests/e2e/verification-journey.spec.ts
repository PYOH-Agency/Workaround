import { test, expect } from '@playwright/test'
import { clearMailbox, signIn } from './helpers'
import { companyWithActivities, makeStaff } from './fixtures'

/**
 * Le parcours de M3 : d'une activite declaree a une page publique.
 *
 * Il verifie ce que les tests unitaires ne peuvent pas voir — que le depot, la
 * revue interne, le calcul de visibilite et la page publique tiennent ensemble.
 */
const ARTISAN = 'artisan-m3@test.local'
const REVIEWER = 'relecteur-m3@test.local'

test('de l’attestation déposée à la page publique', async ({ browser }) => {
  // Un contexte par acteur : les cookies d'authentification sont partages a
  // l'interieur d'un contexte, et connecter le relecteur dans celui de
  // l'artisan ecraserait sa session. Le premier essai s'y est fait prendre —
  // l'artisan se retrouvait redirige vers l'inscription.
  const context = await browser.newContext()
  const page = await context.newPage()
  await clearMailbox()

  await test.step('connexion de l’artisan', async () => {
    await signIn(page, ARTISAN)
  })

  // Deux activites declarees : plomberie et electricite. Une seule sera couverte.
  const company = await companyWithActivities(ARTISAN, ['30', '34'])

  await test.step('les cinq écrans s’atteignent depuis la navigation', async () => {
    // Et non par `goto` : une URL en dur passerait meme si aucun ecran ne menait
    // ici — c'est exactement le defaut que cette navigation corrige. Les cinq
    // sont parcourues, pas une seule : une entree dont l'adresse ne repond plus
    // apres un renommage de route est le meme defaut, revenu par la fenetre.
    await page.goto('/devis')

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })

    // Dans l'ordre d'affichage, pour finir sur la verification que la suite lit.
    const ENTRIES = [
      { label: 'Devis', path: '/devis' },
      { label: 'Factures', path: '/factures' },
      { label: 'Agenda', path: '/agenda' },
      { label: 'Passeport', path: '/mon-passeport' },
      { label: 'Vérification', path: '/verification' },
    ]

    for (const { label, path } of ENTRIES) {
      await nav.getByRole('link', { name: label, exact: true }).click()

      await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`))
      // La barre est rendue par `AppShell` : la retrouver prouve que la route a
      // repondu, et non qu'elle a rendu une page introuvable.
      await expect(nav).toBeVisible()
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
    }

    await expect(page.getByTestId('statut-30')).toHaveText('Attestation manquante')
    await expect(page.getByTestId('statut-34')).toHaveText('Attestation manquante')
  })

  await test.step('sur un téléphone, la navigation se replie sans rien perdre', async () => {
    // L'artisan est sur un chantier, une main prise. Un menu ou un defilement
    // horizontal cacherait exactement ce que cette navigation existe pour
    // montrer — c'est le defaut corrige, qui reviendrait par la fenetre.
    await page.setViewportSize({ width: 375, height: 812 })

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    const links = nav.getByRole('link')
    // Sept, et non six : « Offre Pro » s'ajoute aux six precedentes. Elle ne
    // se montre qu'a un responsable en gratuit — ce que cet artisan est — et
    // disparaitra le jour ou il prendra le plan. Le compte suit donc la table
    // de navigation, entree par entree, plutot qu'un nombre pose une fois.
    await expect(links).toHaveCount(7)

    // 44 px : le seuil que le socle s'impose deja pour `Input`. La cible faisait
    // la hauteur du texte, soit 20 px, avant ce lot.
    for (const link of await links.all()) {
      const box = await link.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }

    // Une barre d'une seule ligne ferait exactement 44 px de haut : au-dela,
    // c'est qu'elle s'est repliee.
    const navBox = await nav.boundingBox()
    expect(navBox?.height ?? 0).toBeGreaterThan(44)

    // Et le repli est un vrai repli : rien ne part hors de l'ecran.
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )
    expect(fits).toBe(true)

    await page.setViewportSize({ width: 1280, height: 720 })
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

  const reviewerContext = await browser.newContext()
  const reviewer = await reviewerContext.newPage()

  await test.step('un relecteur interne établit la correspondance', async () => {
    await signIn(reviewer, REVIEWER)
    await makeStaff(REVIEWER)

    await reviewer.goto('/attestations')
    await reviewer.getByRole('link', { name: /PLOMBERIE DU PARCOURS/ }).click()

    await reviewer.getByLabel('Assureur').fill('SMABTP')
    await reviewer.getByLabel('Numéro de police').fill('D-2026-000123')
    await reviewer.getByLabel('Valide du').fill('2026-01-01')
    await reviewer.getByLabel('Valide jusqu’au').fill('2026-12-31')

    // La correspondance : le libelle lu, et l'activite du referentiel.
    await reviewer
      .getByLabel('Libellé lu sur l’attestation')
      .fill('Plomberie - installations sanitaires')
    await reviewer.getByLabel('Activité du référentiel').selectOption('30')

    await reviewer.getByRole('button', { name: 'Valider l’attestation' }).click()
    await expect(reviewer.getByText('Attestation validée.')).toBeVisible()
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

    await expect(anonymous.getByTestId('activite-30')).toBeVisible()
    // L'electricite n'est pas masquee a l'ecran : elle est absente de la requete.
    await expect(anonymous.getByTestId('activite-34')).toHaveCount(0)
    await expect(anonymous.getByText('SMABTP')).toBeVisible()
    await anonymous.close()
  })

  await test.step('le passeport mène à la fiche publique', async () => {
    // L'entreprise est couverte depuis l'etape precedente : le lien doit exister
    // et pointer vers `/artisan/`, jamais vers `/p/` qui compterait la visite.
    await page.goto('/mon-passeport')
    await expect(page.getByTestId('voir-fiche-publique')).toHaveAttribute(
      'href',
      `/artisan/${company.slug}`,
    )
  })

  await test.step('le relecteur voit la file de supervision, sans la nav artisan', async () => {
    await reviewer.goto('/supervision')
    await expect(reviewer.getByRole('heading', { name: 'Supervision' })).toBeVisible()

    // L'assertion a change de forme, pas d'intention. Elle exigeait AUCUNE
    // navigation, du temps ou le backoffice partageait `AppShell` et n'avait
    // que celle de l'artisan a se voir retirer. Il a la sienne depuis
    // `AdminShell` : ce qu'il faut verifier n'est plus son absence, c'est que
    // les liens « Devis » ou « Passeport » n'y figurent pas — ils menent a
    // l'entreprise du relecteur, pas a celle qu'il examine.
    const nav = reviewer.getByRole('navigation', { name: 'Navigation principale' })

    await expect(nav.getByRole('link', { name: 'Supervision' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Attestations' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Devis' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Passeport' })).toHaveCount(0)
  })

  await test.step('un artisan n’accède pas à la supervision', async () => {
    // Meme garde que la file d'attestations : l'existence de l'ecran ne le
    // regarde pas.
    const forbidden = await page.goto('/supervision')
    expect(forbidden?.status()).toBe(404)
  })

  await test.step('un artisan ne peut pas valider sa propre attestation', async () => {
    // Confondre `member` et `staff` donnerait a l'artisan le pouvoir de se
    // verifier lui-meme, ce qui reduirait a neant la valeur du label.
    const response = await page.goto('/attestations')
    expect(response?.status()).toBe(404)
  })

  await context.close()
  await reviewerContext.close()
})
