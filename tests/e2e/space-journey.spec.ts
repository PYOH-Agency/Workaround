import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import {
  clearMailbox,
  contactMailFor,
  magicLinkFor,
  mailboxHas,
  quoteLinkFor,
  signatureReceiptFor,
  smsCodeFor,
} from './helpers'
import { quoteFor } from './fixtures'

/**
 * Le parcours de M6 : de la signature d'un devis au dossier du client, puis du
 * fil derive a la reception declaree.
 *
 * **Deux contextes, deux sessions.** L'artisan garde la sienne d'un bout a
 * l'autre : le verificateur PKCE du lien magique vit dans les cookies du
 * contexte qui l'a demande, et une seconde connexion depuis un autre contexte
 * echoue. C'est aussi plus fidele — le client et l'artisan ne partagent pas un
 * navigateur.
 *
 * Comptes neufs a chaque lancement : le parcours compte des chantiers, et des
 * comptes reutilises feraient s'accumuler ceux des lancements precedents.
 */
const ARTISAN = `artisan-m6-${randomUUID().slice(0, 8)}@test.local`
const CLIENT = `client-m6-${randomUUID().slice(0, 8)}@test.local`

test('de la signature du devis à la réception déclarée', async ({ page, browser }) => {
  await clearMailbox()

  const shop = await browser.newContext()
  const artisan = await shop.newPage()

  await test.step('connexion de l’artisan', async () => {
    await artisan.goto('/connexion')
    await artisan.getByLabel('E-mail').fill(ARTISAN)
    await artisan.getByRole('button', { name: 'Recevoir le lien' }).click()
    await artisan.goto(await magicLinkFor(ARTISAN))
  })

  // Brouillon, pas signe : la signature doit passer par l'ecran du client,
  // sinon rien de ce que ce jalon construit ne serait exerce.
  const quote = await quoteFor(ARTISAN, 'draft')

  await test.step('l’artisan envoie le devis à son client', async () => {
    await artisan.goto(`/devis/${quote.id}`)
    await artisan.getByRole('button', { name: 'Envoyer au client' }).click()
    await expect(artisan.getByTestId('statut-devis')).toHaveText('Envoyé')
  })

  await test.step('le client apprend son rôle de témoin AVANT de signer', async () => {
    await page.goto(await quoteLinkFor('client-m2@test.local'))
    await page.getByRole('button', { name: 'Recevoir le code' }).click()

    // Le verrou n° 1 de l'AIPD. L'en informer apres reviendrait a le prevenir
    // d'un traitement auquel il a deja contribue.
    await expect(page.getByText('Votre signature sert aussi de témoignage')).toBeVisible()
  })

  await test.step('il signe, sans qu’aucun compte ne lui soit demandé', async () => {
    await page.getByLabel('Votre nom').fill('Paul Martin')
    await page.getByLabel('Votre e-mail').fill(CLIENT)
    await page.getByLabel('Code reçu par SMS').fill(await smsCodeFor('0612345678'))
    await page.getByRole('button', { name: 'Signer le devis' }).click()

    await expect(page.getByRole('status')).toContainText('Devis signé')
  })

  await test.step('il reçoit l’adresse de son dossier', async () => {
    expect(await signatureReceiptFor(CLIENT)).toContain('/mes-logements')
  })

  await test.step('il se connecte et arrive chez lui, pas sur l’inscription artisan', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(CLIENT)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(CLIENT))

    await expect(page).toHaveURL(/\/mes-logements$/)
    await expect(page.getByRole('heading', { name: 'Mes logements' })).toBeVisible()
  })

  await test.step('il voit son chantier, et le nom de l’entreprise', async () => {
    await expect(page.getByText('PLOMBERIE DU PARCOURS')).toBeVisible()
    await expect(page.getByText('12 rue Fondaudège')).toBeVisible()
  })

  await test.step('le dossier affiche une chronologie sans aucune publication', async () => {
    // La decision qui porte M6·B : le fil est derive avant d'etre enrichi.
    await page.goto(`/mes-chantiers/${quote.id}`)

    await expect(page.getByTestId('fil')).toContainText('Devis signé')
  })

  await test.step('aucune date de garantie n’est affirmée', async () => {
    // La reception tacite exige deux criteres cumulatifs et nous n'en
    // connaissons qu'un : imprimer une date ferait manquer un delai.
    await expect(page.getByTestId('garanties')).toContainText('réception des travaux')
    await expect(page.getByTestId('garanties')).not.toContainText('2036')
  })

  await test.step('ses documents renvoient aux PDF déjà émis', async () => {
    await expect(page.getByTestId('documents')).toContainText('Devis D2026-0001')
  })

  await test.step('l’artisan publie, et son client le voit', async () => {
    await artisan.goto(`/devis/${quote.id}/chantier`)
    await artisan.getByTestId('message-chantier').fill('Dépose terminée, pose demain.')
    await artisan.getByRole('button', { name: 'Publier' }).click()
    await expect(artisan.getByTestId('fil')).toContainText('Dépose terminée')

    await page.reload()
    await expect(page.getByTestId('fil')).toContainText('Dépose terminée')
  })

  await test.step('l’artisan marque le chantier terminé', async () => {
    // La reception ne se declare pas sur des travaux inacheves.
    await artisan.goto(`/devis/${quote.id}`)
    await artisan.getByRole('button', { name: 'Marquer terminé' }).click()
    await expect(artisan.getByText('Chantier terminé le')).toBeVisible()
  })

  await test.step('le client déclare sa réception, et ses garanties s’ouvrent', async () => {
    await page.reload()
    await page.getByTestId('date-reception').fill('2026-08-09')
    await page.getByRole('button', { name: 'Enregistrer la réception' }).click()

    await expect(page.getByTestId('garanties')).toContainText('2036')
    await expect(page.getByTestId('garanties')).toContainText('n’engage pas les parties')
  })

  await test.step('l’artisan voit la réception déclarée par son client', async () => {
    // Un fait partage ne se consigne pas en secret.
    await artisan.goto(`/devis/${quote.id}/chantier`)
    await expect(artisan.getByText('a déclaré la réception des travaux')).toBeVisible()
  })

  await shop.close()

  await test.step('son répertoire retient l’entreprise et son chantier', async () => {
    await page.goto('/mon-repertoire')

    await expect(page.getByTestId('repertoire')).toContainText('PLOMBERIE DU PARCOURS')
    await expect(page.getByTestId('repertoire')).toContainText('Remplacement chauffe-eau')
  })

  await test.step('il ajoute le couvreur que nous ne connaissons pas', async () => {
    await page.getByTestId('nom-entreprise').fill('Couvreur de 2019')
    await page.getByLabel('Téléphone').fill('0556000000')
    await page.getByRole('button', { name: 'Ajouter au répertoire' }).click()

    await expect(page.getByTestId('repertoire')).toContainText('Couvreur de 2019')
    // Ce que nous n'en savons pas est dit, sinon la verification semblerait
    // s'etendre a tout le carnet.
    await expect(page.getByText('nous ne les avons pas prévenues')).toBeVisible()
  })

  await test.step('aucune invitation n’est partie', async () => {
    // La decision la plus facile a eroder du jalon : elle ne coute rien a
    // trahir et se verrait six mois plus tard.
    expect(await mailboxHas('Couvreur de 2019')).toBe(false)
  })

  await test.step('il recontacte l’entreprise, qui apprend que c’est son client', async () => {
    await page.getByRole('link', { name: 'Recontacter' }).first().click()
    await page.getByTestId('message-reprise').fill('Bonjour, le chauffe-eau refait un bruit.')
    await page.getByRole('button', { name: 'Envoyer' }).click()

    await expect(page.getByTestId('message-envoye')).toBeVisible()

    const relayed = await contactMailFor('contact@parcours.local')
    expect(relayed).toContain('Vous avez déjà travaillé pour cette personne')
    expect(relayed).toContain('D2026-0001')
  })
})
