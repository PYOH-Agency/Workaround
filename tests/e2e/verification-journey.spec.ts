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

test('de l’attestation déposée à la page publique', async ({ browser }) => {
  // Un contexte par acteur : les cookies d'authentification sont partages a
  // l'interieur d'un contexte, et connecter le relecteur dans celui de
  // l'artisan ecraserait sa session. Le premier essai s'y est fait prendre —
  // l'artisan se retrouvait redirige vers l'inscription.
  const context = await browser.newContext()
  const page = await context.newPage()
  await clearMailbox()

  await test.step('connexion de l’artisan', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  // Deux activites declarees : plomberie et electricite. Une seule sera couverte.
  const company = await companyWithActivities(ARTISAN, ['30', '34'])

  await test.step('la vérification s’atteint depuis la navigation', async () => {
    // Et non par `goto` : une URL en dur passerait meme si aucun ecran ne menait
    // ici — c'est exactement le defaut que cette navigation corrige.
    await page.goto('/devis')

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await nav.getByRole('link', { name: 'Vérification' }).click()

    await expect(page).toHaveURL(/\/verification$/)
    await expect(nav.getByRole('link', { name: 'Vérification' })).toHaveAttribute(
      'aria-current',
      'page',
    )

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

  const reviewerContext = await browser.newContext()
  const reviewer = await reviewerContext.newPage()

  await test.step('un relecteur interne établit la correspondance', async () => {
    await reviewer.goto('/connexion')
    await reviewer.getByLabel('E-mail').fill(REVIEWER)
    await reviewer.getByRole('button', { name: 'Recevoir le lien' }).click()
    await reviewer.goto(await magicLinkFor(REVIEWER))
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

    // Le backoffice partage `AppShell`, donc l'en-tete. Les liens « Devis » ou
    // « Passeport » n'y ont rien a faire : ils menent a l'entreprise du
    // relecteur, pas a celle qu'il examine.
    await expect(
      reviewer.getByRole('navigation', { name: 'Navigation principale' }),
    ).toHaveCount(0)
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
