import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, disputePathFor, magicLinkFor } from './helpers'
import { lateChantierFor } from './fixtures-chantier'

/**
 * Le parcours de M5·C : d'un chantier en retard a une mesure arbitree.
 *
 * Ce que les tests unitaires ne peuvent pas voir — que l'ecran de l'artisan, le
 * lien envoye au client, la page sans compte et le recalcul du passeport
 * tiennent ensemble.
 */
/**
 * Un artisan neuf a chaque lancement.
 *
 * Le parcours compte des chantiers — « 1 chantier », puis « 0 chantier ». Un
 * e-mail fixe ferait s'accumuler ceux des lancements precedents et ces
 * assertions deviendraient fausses au second passage, sans qu'aucun defaut
 * n'existe. C'est la lecon de M2 : un test doit etre rejouable sans
 * reinitialiser la base.
 */
const ARTISAN = `artisan-m5c-${randomUUID().slice(0, 8)}@test.local`

test('d’un chantier en retard à une mesure arbitrée', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion par lien magique', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  const chantier = await lateChantierFor(ARTISAN)

  await test.step('le chantier en retard pese sur le taux de delai', async () => {
    await page.goto('/mon-passeport')
    // Un seul chantier : sous le seuil, aucun taux — mais le volume est la.
    await expect(page.getByTestId('taux-delai')).toContainText('1 chantier')
  })

  await test.step('l’artisan conteste, en motivant', async () => {
    await page.goto(`/devis/${chantier.quoteId}`)
    await page.getByTestId('motif-contestation').fill('Le client était absent trois semaines.')
    await page.getByRole('button', { name: 'Contester cette mesure' }).click()

    await expect(page.getByText('Contestation en cours')).toBeVisible()
  })

  await test.step('le chantier sort aussitot du taux de delai', async () => {
    // Article 18 : pendant l'instruction, le chiffre disputé ne s'affiche pas.
    await page.goto('/mon-passeport')
    await expect(page.getByTestId('contestations-en-cours')).toContainText('1 contestation')
    await expect(page.getByTestId('taux-delai')).toContainText('0 chantier')
    // Mais il reste compte : c'est ce qui rend l'abus visible.
    await expect(page.getByTestId('volume-chantiers')).toContainText('1')
  })

  await test.step('le client tranche, sans compte', async () => {
    await page.goto(await disputePathFor(chantier.customerEmail))

    await expect(page.getByTestId('motif')).toContainText('absent trois semaines')
    // Les metriques de l'entreprise ne le regardent pas et orienteraient sa
    // reponse : aucun pourcentage ne doit figurer sur cette page.
    await expect(page.getByText('%')).toHaveCount(0)

    await page.getByRole('button', { name: 'Oui, c’est exact' }).click()
    await expect(page.getByTestId('reponse-enregistree')).toBeVisible()
  })

  await test.step('le chantier ne revient PAS compte comme respecte', async () => {
    // Le client a dit que le retard n'etait pas imputable a l'artisan. Il n'a
    // pas dit qu'il etait dans les temps.
    await page.goto('/mon-passeport')
    await expect(page.getByTestId('contestations-en-cours')).toHaveCount(0)
    await expect(page.getByTestId('taux-delai')).toContainText('0 chantier')
    await expect(page.getByTestId('taux-delai')).toContainText('Pas encore assez de données')
  })

  await test.step('une seconde contestation est refusee', async () => {
    await page.goto(`/devis/${chantier.quoteId}`)
    await expect(page.getByTestId('motif-contestation')).toHaveCount(0)
    await expect(page.getByText('ce retard ne vous est pas imputable')).toBeVisible()
  })

  await test.step('la declaration complementaire ne change pas le chiffre', async () => {
    await page.getByTestId('declaration').fill('Chantier décalé à la demande du client.')
    await page.getByRole('button', { name: 'Enregistrer la déclaration' }).click()
    await expect(page.getByText('Enregistré.')).toBeVisible()

    await page.goto('/mon-passeport')
    await expect(page.getByTestId('taux-delai')).toContainText('0 chantier')
  })
})
