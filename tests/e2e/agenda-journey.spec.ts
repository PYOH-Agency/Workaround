import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, signIn } from './helpers'
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
    await signIn(page, ARTISAN)
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

  await test.step('il prend une seconde visite, pour demain', async () => {
    // Le rappel part la veille : il faut un rendez-vous de demain pour que le
    // travail de fond ait quelque chose a envoyer.
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

    await page.goto('/agenda/nouveau')
    await page.getByTestId('client-visite').fill('Monsieur Blanc')
    await page.getByLabel('E-mail').fill('blanc@test.local')
    await page.getByLabel('Téléphone').fill('0612345679')
    await page.getByLabel('Adresse').fill('3 place Gambetta')
    await page.getByLabel('Code postal').fill('33000')
    await page.getByLabel('Ville').fill('Bordeaux')
    await page.getByLabel('Objet').fill('Fuite salle de bain')
    await page.getByTestId('debut-visite').fill(`${tomorrow}T09:00`)
    await page.getByLabel('Fin').fill(`${tomorrow}T10:00`)

    await page.getByRole('button', { name: 'Prendre le rendez-vous' }).click()
    await expect(page).toHaveURL(/\/agenda$/)
  })

  /*
    Le rappel de la veille n'est PAS joue ici, a dessein.

    Il part du travail de fond quotidien, qui re-controle aussi chaque
    entreprise aupres des annuaires publics : sur la base de test, cela fait
    des centaines d'appels reseau reels, et le parcours expirerait avant
    d'avoir rien prouve.

    Il est verifie la ou il se verifie honnetement : `due-reminders.test.ts`
    l'envoie pour de vrai dans le collecteur local, ne le renvoie pas deux
    fois, l'ecarte sur un rendez-vous annule, et n'inscrit rien au journal
    quand le message n'a pas pu partir.
  */

  await test.step('le passeport compte la visite, sans encore afficher de médiane', async () => {
    // Aucun devis envoye : rien a mesurer, et le volume le dit.
    await page.goto('/mon-passeport')

    await expect(page.getByTestId('delai-remise')).toContainText('Pas encore assez de données')
    await expect(page.getByTestId('delai-remise')).toContainText('0 devis')
  })

  await test.step('il obtient son adresse d’abonnement, et sait ce qu’elle contient', async () => {
    await page.goto('/agenda/synchronisation')

    await expect(page.getByTestId('abonnement')).toContainText('/abonnement/')
    // Le jeton EST l'autorisation : il doit savoir ce qu'il deplace.
    await expect(page.getByText('Toute personne qui l’obtient voit votre agenda')).toBeVisible()
  })

  await test.step('Apple est expliqué, pas grisé', async () => {
    // Une decision, pas une fonctionnalite en retard.
    await expect(page.getByTestId('apple')).toContainText('nous ne le ferons pas')
    await expect(page.getByTestId('apple')).toContainText('L’abonnement ci-dessus fonctionne')
  })

  await test.step('le flux est un calendrier valide, et porte son rendez-vous', async () => {
    const href = (await page.getByTestId('abonnement').innerText()).trim()
    const feed = await page.request.get(href)

    expect(feed.headers()['content-type']).toContain('text/calendar')

    const body = await feed.text()
    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('Madame Rey')
    // L'adresse contient une virgule : non echappee, la ville disparaitrait.
    expect(body).toContain('Sainte-Catherine\\,')
  })

  await test.step('régénérer l’adresse fait taire l’ancienne', async () => {
    const href = (await page.getByTestId('abonnement').innerText()).trim()
    await page.getByRole('button', { name: 'Régénérer l’adresse' }).click()
    await expect(page.getByTestId('abonnement')).not.toContainText(href.split('/abonnement/')[1])

    expect((await page.request.get(href)).status()).toBe(404)
  })

  await test.step('il annule, et le rendez-vous quitte la semaine', async () => {
    await page.goto('/agenda?semaine=2026-09-01')
    await page.getByRole('button', { name: 'Annuler' }).first().click()
    await page.getByRole('button', { name: 'Confirmer l’annulation' }).click()

    await expect(page.getByTestId('agenda')).not.toContainText('Madame Rey')
  })
})
