import { test, expect } from '@playwright/test'
import { clearMailbox, signIn } from './helpers'
import { signedQuoteFor } from './fixtures'

/**
 * Le parcours de M2 : d'un devis signe a une facture reglee.
 *
 * Celui de M1 s'arrete a la signature ; celui-ci commence apres. Il verifie ce
 * que les tests unitaires ne peuvent pas voir — que les ecrans, les actions
 * serveur et la base tiennent ensemble.
 */
const ARTISAN = 'artisan-m2@test.local'

test('de l’acompte au solde réglé', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion par lien magique', async () => {
    await signIn(page, ARTISAN)
  })

  const quote = await signedQuoteFor(ARTISAN)

  await test.step('un devis signe propose de facturer', async () => {
    await page.goto(`/devis/${quote.id}`)
    await expect(page.getByTestId('statut-devis')).toHaveText('Signé')
    await expect(page.getByTestId('reste-a-facturer')).toHaveText('1 007,00')
  })

  await test.step('emettre un acompte de 30 %', async () => {
    await page.getByLabel('Pourcentage').fill('30')
    await page.getByRole('button', { name: 'Facture d’acompte' }).click()

    await expect(page.getByTestId('numero-facture')).toHaveText(/^F\d{4}-0001$/)
    // 255,00 a 10 % et 18,00 a 20 % : 302,10 TTC. Un taux unique donnerait
    // 300,30 — une declaration de TVA fausse.
    await expect(page.getByTestId('total-ttc')).toHaveText('302,10')
    await expect(page.getByTestId('reste-du')).toHaveText('302,10')
  })

  await test.step('enregistrer l’encaissement de l’acompte', async () => {
    await page.getByLabel('Montant').fill('302,10')
    await page.getByLabel('Date').fill('2026-08-10')
    await page.getByRole('button', { name: 'Enregistrer le paiement' }).click()

    await expect(page.getByTestId('statut-reglement')).toHaveText('Réglée')
    await expect(page.getByTestId('reste-du')).toHaveText('0,00')
  })

  await test.step('le reste a facturer a diminue d’autant', async () => {
    await page.getByRole('link', { name: 'Retour au devis' }).click()
    await expect(page.getByTestId('reste-a-facturer')).toHaveText('704,90')
  })

  await test.step('le solde vaut exactement ce qui reste', async () => {
    await page.getByRole('button', { name: 'Facture de solde' }).click()

    await expect(page.getByTestId('numero-facture')).toHaveText(/^F\d{4}-0002$/)
    await expect(page.getByTestId('total-ttc')).toHaveText('704,90')
  })

  await test.step('le devis est alors integralement facture', async () => {
    await page.getByRole('link', { name: 'Retour au devis' }).click()
    await expect(page.getByTestId('reste-a-facturer')).toHaveText('0,00')

    await page.getByRole('button', { name: 'Facture de solde' }).click()
    // Next.js expose lui aussi un role="alert" pour l'annonce de route : on
    // cible le texte plutot que le role, sinon le selecteur est ambigu.
    await expect(page.getByText('Ce devis est déjà intégralement facturé.')).toBeVisible()
  })

  await test.step('un avenant rouvre la facturation d’un devis soldé', async () => {
    // Ce que ce jalon debloque : sans avenant, l'artisan dont le chantier
    // grossit ne pouvait ni facturer plus, ni creer l'avenant que le message
    // d'erreur lui recommandait. Il sortait son complement de l'outil.
    await page.getByRole('button', { name: 'Créer un avenant' }).click()
    await page.getByRole('button', { name: 'Confirmer l’avenant' }).click()

    // On arrive sur le brouillon de la version 2, lignes reprises et modifiables.
    await expect(page.getByRole('heading', { name: /Modifier D/ })).toBeVisible()
    await expect(page.getByLabel('Désignation').first()).toHaveValue(/Chauffe-eau/)
  })

  await test.step('l’historique des versions reste consultable', async () => {
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()

    await expect(page.getByTestId('version-1')).toContainText('Devis initial')
    await expect(page.getByTestId('version-2')).toContainText('Avenant n° 1')
  })

  await test.step('le solde a marqué le chantier terminé', async () => {
    // L'emission du solde constate la reception des travaux : aucune saisie
    // supplementaire n'est demandee a l'artisan.
    await page.goto('/mon-passeport')
    await expect(page.getByTestId('volume-chantiers')).toContainText('1')
  })

  await test.step('aucun taux sous le seuil, mais le volume est là', async () => {
    // La reponse au biais de selection, vue de l'artisan : on ne lui cache pas
    // sur quoi le calcul porte, meme quand il ne porte presque sur rien.
    await expect(page.getByTestId('taux-ecart')).toContainText('Pas encore assez de données')
    await expect(page.getByTestId('taux-ecart')).toContainText('1 chantier')
  })

  await test.step('le client consulte sa facture sans compte', async () => {
    await page.goto('/factures')
    await page.getByText('F2026-0001').click()

    const link = await page.getByTestId('lien-public').getAttribute('href')
    await page.goto(link!)

    await expect(page.getByTestId('total-ttc')).toHaveText('302,10')
    await expect(page.getByTestId('statut-reglement')).toHaveText('Réglée')
    // Mentions imposees par l'article L243-2 du Code des assurances.
    await expect(page.getByText('Assurance professionnelle')).toBeVisible()
  })
})
