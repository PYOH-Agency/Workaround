import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'
import { quoteFor, switchToPro } from './fixtures'

/**
 * Le parcours de M8·B : d'un chantier découpé en situations à une retenue de
 * garantie qui n'est pas un impayé.
 */
const PATRON = `patron-m8b-${randomUUID().slice(0, 8)}@test.local`

/** Chaque ligne du devis reçoit le même avancement cumulé. */
async function declare(page: import('@playwright/test').Page, percent: string) {
  for (const field of await page.getByLabel('Avancement (%)').all()) await field.fill(percent)
}

test('des situations de travaux à la retenue de garantie', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(PATRON)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(PATRON))
  })

  // Devis signé, 1 007,00 TTC, retenue de garantie de 5 % stipulée.
  const quote = await quoteFor(PATRON, 'signed', 5)
  await switchToPro(PATRON)

  await test.step('l’écran de situation propose chaque ligne du devis', async () => {
    await page.goto(`/devis/${quote.id}`)
    await page.getByRole('link', { name: 'Nouvelle situation' }).click()

    await expect(page.getByTestId('situation')).toBeVisible()
    await expect(page.getByText('Chauffe-eau 200 L posé')).toBeVisible()
    await expect(page.getByText('Déplacement')).toBeVisible()
  })

  await test.step('l’aperçu annonce ce que la facture portera', async () => {
    await declare(page, '50')
    // 50 % de 910,00 HT = 455,00 HT, soit 503,50 TTC.
    await expect(page.getByTestId('montant-situation')).toHaveText('503,50')
  })

  await test.step('déclarer 50 % facture la moitié du devis', async () => {
    await page.getByRole('button', { name: 'Établir la situation' }).click()

    await expect(page.getByTestId('numero-facture')).toBeVisible()
    // **L'apercu ne mentait pas** : meme chiffre, calcule par la meme fonction.
    await expect(page.getByTestId('reste-du')).toHaveText('503,50')
  })

  await test.step('la retenue de garantie s’affiche, et nous ne détenons rien', async () => {
    await expect(page.getByTestId('retenue')).toHaveText('25,18')
    await expect(page.getByText(/nous ne détenons aucun fonds/)).toBeVisible()

    // Sans réception déclarée, la date reste inconnue — et l'écran le dit
    // plutôt que d'inventer.
    await expect(page.getByText(/n’a pas encore déclaré la réception/)).toBeVisible()
  })

  await test.step('encaisser tout sauf la retenue ne laisse PAS un impayé', async () => {
    // 503,50 − 25,18 = 478,32.
    await page.getByLabel('Montant').fill('478.32')
    await page.getByLabel('Date').fill('2026-08-10')
    await page.getByRole('button', { name: 'Enregistrer le paiement' }).click()

    // **La décision structurante du jalon, vérifiée à l'écran.**
    await expect(page.getByTestId('statut-reglement')).toHaveText('Retenue en cours')
  })

  await test.step('la situation suivante ne facture que la différence', async () => {
    await page.goto(`/devis/${quote.id}/situation`)
    await declare(page, '100')

    await expect(page.getByTestId('montant-situation')).toHaveText('503,50')
    await page.getByRole('button', { name: 'Établir la situation' }).click()

    await expect(page.getByTestId('reste-du')).toHaveText('503,50')
  })

  await test.step('le devis est soldé au centime', async () => {
    await page.goto(`/devis/${quote.id}`)
    await expect(page.getByTestId('reste-a-facturer')).toHaveText('0,00')
  })
})
