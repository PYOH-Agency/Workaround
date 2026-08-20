import { test, expect } from '@playwright/test'
import { clearMailbox, signIn } from './helpers'
import { compagnonOfNewCompany, signedQuoteFor } from './fixtures'

/**
 * Le parcours de l'accueil : la racine sert deux publics.
 *
 * Un visiteur anonyme continue d'y voir la landing commerciale ; un artisan
 * connecte y voit desormais son accueil — l'argent en cours, ce qui l'attend,
 * sa journee — la ou la liste des devis en tenait lieu jusque-la.
 */

const ARTISAN = 'artisan-accueil@test.local'

test('un visiteur anonyme voit la landing commerciale', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /gratuits à vie/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Commencer' }).first()).toBeVisible()
})

test('un artisan connecté voit son accueil, et le logo de l’en-tête y ramène', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion par lien magique', async () => {
    await signIn(page, ARTISAN)
  })

  // Sans devis, l'accueil rendrait la mise en route en trois etapes, pas
  // l'accueil complet : le decor a besoin d'au moins un devis.
  await signedQuoteFor(ARTISAN)

  await test.step('l’accueil affiche l’argent en cours', async () => {
    await page.goto('/')

    // Un devis signe de 1 007,00 TTC, ni facture ni encaisse : tout se
    // retrouve dans le carnet de commandes.
    await expect(page.getByTestId('money-in-flight')).toHaveText('1 007,00')
  })

  await test.step('le logo de l’en-tête, dont l’aria-label est « Accueil », y ramène depuis /devis', async () => {
    await page.goto('/devis')

    // `getByRole('link', { name: 'Accueil' })` serait ambigu : la navigation
    // porte elle aussi une entree « Accueil », par son texte plutot que son
    // aria-label. Seul l'attribut cible sans ambiguite le logo.
    await page.locator('a[aria-label="Accueil"]').click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('money-in-flight')).toHaveText('1 007,00')
  })
})

const COMPAGNON = 'compagnon-accueil@test.local'

test('un compagnon d’entreprise neuve voit un accueil sobre, pas trois refus differes', async ({
  page,
}) => {
  await clearMailbox()

  await test.step('connexion par lien magique', async () => {
    await signIn(page, COMPAGNON)
  })

  // Entreprise sans mentions, sans attestation, sans devis : le compagnon n'a
  // aucune des trois capacites — `quote.write`, `legal.write` deux fois —
  // qu'exige la mise en route en trois etapes.
  await compagnonOfNewCompany(COMPAGNON)

  await test.step('aucun des trois gestes reserves au patron ne lui est propose', async () => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Établir un devis' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Compléter mes mentions' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Déposer mon attestation' })).toHaveCount(0)

    // Mais l'ecran n'est pas nu pour autant : il lui reste un geste reel.
    await expect(page.getByRole('link', { name: 'Voir l’agenda' })).toBeVisible()
  })
})
