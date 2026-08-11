import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor, quoteLinkFor, smsCodeFor } from './helpers'

/**
 * Le parcours entier de M1, du premier e-mail a la signature.
 *
 * Ce test touche le reseau : l'inscription interroge l'API Recherche
 * d'Entreprises, et la signature demande un jeton a l'autorite d'horodatage.
 * C'est assume — c'est le parcours reel, et c'est le seul test qui prouve que
 * les briques tiennent ensemble.
 */

const ARTISAN = 'artisan-e2e@test.local'
const CUSTOMER = 'client-e2e@test.local'
const PHONE = '0698765432'
// Entreprise reelle et active, distincte de celle du jeu de donnees.
const SIRET = '75135373100027'

test('de la connexion a la signature du devis', async ({ page, context }) => {
  await clearMailbox()

  await test.step('connexion par lien magique', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await expect(page.getByRole('status')).toContainText(ARTISAN)

    await page.goto(await magicLinkFor(ARTISAN))
  })

  await test.step('inscription par SIRET', async () => {
    await expect(page.getByRole('heading', { name: 'Votre entreprise' })).toBeVisible()
    await page.getByLabel('SIRET').fill(SIRET)
    await page.getByRole('button', { name: 'Continuer' }).click()

    // Raison sociale recuperee sur l'API, pas saisie a la main. Elle n'est
    // plus un titre de `/devis` — ce bloc en a ete retire — mais l'en-tete
    // applicatif la porte toujours, sur tout ecran connecte.
    await expect(page.getByText(/GARANCE PLOMBERIE/i)).toBeVisible()
  })

  await test.step('les mentions obligatoires sont exigees avant tout devis', async () => {
    // L'inscription atterrit desormais sur l'accueil (`/`) et non plus sur
    // `/devis` : sans aucun devis encore, c'est la mise en route en trois
    // etapes qui s'affiche, avec son propre bouton « Établir un devis ».
    await page.getByRole('link', { name: 'Établir un devis' }).click()

    // Redirection : sans elles, un devis exposerait l'artisan a une amende.
    await expect(page.getByRole('heading', { name: /Mentions de vos devis/i })).toBeVisible()

    // Forme juridique et numero de TVA sont deja preremplis depuis l'annuaire.
    await expect(page.getByLabel('Forme juridique')).not.toHaveValue('')
    await expect(page.getByLabel('Numéro de TVA intracommunautaire')).toHaveValue('FR37751353731')

    await page.getByLabel('Numéro d’immatriculation').fill('RCS Bordeaux 751 353 731')
    await page.getByLabel('Téléphone').fill('0556123456')
    await page.getByLabel('E-mail').fill('contact@garance-plomberie.fr')
    await page.getByLabel('Nom de l’assureur').fill('SMABTP')
    await page.getByLabel('Adresse de l’assureur').fill('114 avenue Émile Zola, 75015 Paris')
    await page.getByLabel('Référence du contrat').fill('D-2026-000123')
    await page.getByLabel('Activités garanties').fill('Plomberie, chauffage')
    await page.getByLabel('Zone géographique couverte').fill('France métropolitaine')
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    // Retour sur `/devis`, ou l'en-tete porte toujours la raison sociale.
    await expect(page.getByText(/GARANCE PLOMBERIE/i)).toBeVisible()
  })

  await test.step('rediger un devis a deux taux de TVA', async () => {
    await page.getByRole('link', { name: 'Créer un devis' }).click()

    await page.getByLabel('Client', { exact: true }).fill('Paul Martin')
    await page.getByLabel('E-mail du client').fill(CUSTOMER)
    await page.getByLabel('Téléphone du client').fill(PHONE)
    await page.getByLabel('Intitulé').fill('Remplacement chauffe-eau')
    await page.getByLabel('Adresse du chantier').fill('12 rue Fondaudège')
    await page.getByLabel('Code postal').fill('33000')
    await page.getByLabel('Ville').fill('Bordeaux')
    await page.getByLabel('Délai d’exécution (jours ouvrés)').fill('5')

    const firstLine = page.getByLabel('Désignation').first()
    await firstLine.fill('Chauffe-eau 200 L posé')
    await page.getByLabel('Quantité').first().fill('1')
    await page.getByLabel('Prix unitaire HT').first().fill('850.00')
    await page.getByLabel('TVA').first().selectOption('1000')

    await page.getByRole('button', { name: 'Ajouter une ligne' }).click()
    await page.getByLabel('Désignation').nth(1).fill('Déplacement')
    await page.getByLabel('Quantité').nth(1).fill('1')
    await page.getByLabel('Prix unitaire HT').nth(1).fill('60.00')
    await page.getByLabel('TVA').nth(1).selectOption('2000')

    // 850 a 10 % + 60 a 20 % = 910 HT, 97 de TVA, 1 007 TTC.
    await expect(page.getByTestId('total-ttc')).toHaveText('1 007,00')

    await page.getByRole('button', { name: 'Enregistrer le devis' }).click()
    await expect(page.getByTestId('statut-devis')).toHaveText('Brouillon')
    await expect(page.getByTestId('total-ttc')).toHaveText('1 007,00')
  })

  await test.step('envoyer le devis au client', async () => {
    await page.getByRole('button', { name: 'Envoyer au client' }).click()
    await expect(page.getByTestId('lien-public')).toBeVisible()
  })

  const customerPage = await context.newPage()

  await test.step('le client consulte son devis sans compte', async () => {
    await customerPage.goto(await quoteLinkFor(CUSTOMER))

    await expect(customerPage.getByText('Chauffe-eau 200 L posé')).toBeVisible()
    await expect(customerPage.getByTestId('total-ttc')).toHaveText('1 007,00')
    // Mentions imposees par l'article L243-2 du Code des assurances.
    await expect(customerPage.getByText('Assurance professionnelle')).toBeVisible()
    await expect(customerPage.getByText(/D-2026-000123/)).toBeVisible()
    // Omettre cette mention porterait le delai de retractation a douze mois.
    await expect(customerPage.getByText('Droit de rétractation')).toBeVisible()
    await expect(customerPage.getByText(/Validité de cette offre : 90 jours/)).toBeVisible()
  })

  await test.step('un mauvais code ne signe rien', async () => {
    await customerPage.getByRole('button', { name: 'Recevoir le code' }).click()
    await customerPage.getByLabel('Votre nom').fill('Paul Martin')
    await customerPage.getByLabel('Votre e-mail').fill(CUSTOMER)
    await customerPage.getByLabel('Code reçu par SMS').fill('000000')
    await customerPage.getByRole('button', { name: 'Signer le devis' }).click()

    // Next.js expose lui aussi un role="alert" pour l'annonce de route :
    // on cible le texte plutot que le role, sinon le selecteur est ambigu.
    await expect(customerPage.getByText('Code incorrect.')).toBeVisible()
  })

  await test.step('le bon code signe le devis', async () => {
    await customerPage.getByLabel('Code reçu par SMS').fill(await smsCodeFor(PHONE))
    await customerPage.getByRole('button', { name: 'Signer le devis' }).click()

    await expect(customerPage.getByRole('status')).toContainText('Devis signé')
  })

  await test.step("l'artisan voit son devis signe", async () => {
    await page.reload()
    await expect(page.getByTestId('statut-devis')).toHaveText('Signé')
  })
})
