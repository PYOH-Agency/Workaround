import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'
import { companyWithActivities } from './fixtures'

/**
 * Le parcours de M7·A : de la prise de rendez-vous de visite a la semaine.
 *
 * Artisan neuf a chaque lancement : le parcours compte des rendez-vous, et un
 * compte reutilise ferait s'accumuler ceux des lancements precedents.
 */
const ARTISAN = `artisan-m7-${randomUUID().slice(0, 8)}@test.local`

test('de la prise de rendez-vous à la semaine', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion de l’artisan', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  // L'inscription par SIRET appelle l'annuaire des entreprises, et
  // quote-journey la couvre deja de bout en bout. La rejouer ici n'ajouterait
  // aucune garantie et doublerait la duree du parcours.
  await companyWithActivities(ARTISAN, ['30'])

  await test.step('l’agenda est atteignable depuis l’en-tête', async () => {
    // Un ecran qu'on ne peut pas atteindre n'existe pas — et c'est le sort qui
    // attendait l'agenda. L'entreprise vient d'etre creee : on repasse par
    // l'atelier, qui est le seul ecran porteur de l'en-tete.
    await page.goto('/devis')

    await page.getByRole('navigation').getByRole('link', { name: 'Agenda' }).click()
    await expect(page).toHaveURL(/\/agenda$/)
  })

  await test.step('il prend un rendez-vous de visite, qui crée le chantier', async () => {
    await page.getByRole('link', { name: 'Prendre un rendez-vous' }).click()

    await page.getByTestId('client-visite').fill('Madame Rey')
    await page.getByLabel('E-mail').fill('rey@test.local')
    await page.getByLabel('Téléphone').fill('0612345678')
    await page.getByLabel('Adresse').fill('8 rue Sainte-Catherine')
    await page.getByLabel('Code postal').fill('33000')
    await page.getByLabel('Ville').fill('Bordeaux')
    await page.getByLabel('Objet').fill('Remplacement chaudière')
    await page.getByTestId('debut-visite').fill('2026-09-01T09:00')
    await page.getByLabel('Fin').fill('2026-09-01T10:00')

    await page.getByRole('button', { name: 'Prendre le rendez-vous' }).click()
    await expect(page).toHaveURL(/\/agenda$/)
  })

  await test.step('la semaine porte l’adresse et le numéro', async () => {
    // C'est tout l'interet : sans eux, ce serait une ligne de calendrier de
    // plus, et il la noterait sur son telephone.
    await page.goto('/agenda?semaine=2026-09-01')

    await expect(page.getByTestId('agenda')).toContainText('Madame Rey')
    await expect(page.getByTestId('agenda')).toContainText('8 rue Sainte-Catherine')
    await expect(page.getByTestId('agenda')).toContainText('Remplacement chaudière')
    await expect(page.getByTestId('agenda')).toContainText('09:00')
  })

  await test.step('la semaine précédente est vide, et reste une semaine', async () => {
    await page.goto('/agenda?semaine=2026-08-25')

    await expect(page.getByTestId('agenda')).not.toContainText('Madame Rey')
    // Sept jours, meme vides : sauter les jours creux ferait sauter le lecteur.
    await expect(page.getByTestId('agenda').locator('> li')).toHaveCount(7)
  })

  await test.step('il annule, et le rendez-vous quitte la semaine', async () => {
    await page.goto('/agenda?semaine=2026-09-01')
    await page.getByRole('button', { name: 'Annuler' }).first().click()
    await page.getByRole('button', { name: 'Confirmer l’annulation' }).click()

    await expect(page.getByTestId('agenda')).not.toContainText('Madame Rey')
  })
})
