import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import {
  clearMailbox,
  magicLinkFor,
  quoteLinkFor,
  signatureReceiptFor,
  smsCodeFor,
} from './helpers'
import { quoteFor } from './fixtures'

/**
 * Le parcours de M6·A : de la signature d'un devis a l'arrivee du client chez
 * lui, sans qu'aucun compte ne lui ait jamais ete demande.
 *
 * Artisan et client neufs a chaque lancement : le parcours compte des
 * chantiers, et des comptes reutilises feraient s'accumuler ceux des lancements
 * precedents.
 */
const ARTISAN = `artisan-m6a-${randomUUID().slice(0, 8)}@test.local`
const CLIENT = `client-m6a-${randomUUID().slice(0, 8)}@test.local`

test('de la signature du devis au dossier du client', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion de l’artisan', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  // Brouillon, pas signe : la signature doit passer par l'ecran du client, sinon
  // rien de ce que ce jalon construit ne serait exerce.
  const quote = await quoteFor(ARTISAN, 'draft')

  await test.step('l’artisan envoie le devis à son client', async () => {
    await page.goto(`/devis/${quote.id}`)
    await page.getByRole('button', { name: 'Envoyer au client' }).click()
    await expect(page.getByTestId('statut-devis')).toHaveText('Envoyé')
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
    await page.context().clearCookies()
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
})
