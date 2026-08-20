import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { signIn } from './helpers'
import { companyWithActivities, quoteFor } from './fixtures'

/**
 * Les notices d'ecran : elles se montrent une fois, se referment, et se
 * rouvrent.
 *
 * Ce que ce parcours garde, et qu'aucun test unitaire ne voit : le rejet vit en
 * BASE, pas dans le navigateur. La spec (§4) le decide parce que l'artisan
 * saisit au bureau et consulte sur le chantier — un rejet local lui reservirait
 * chaque carte sur le second appareil. Un rechargement ne suffit donc pas a le
 * prouver : il faut un contexte neuf, sans le moindre stockage partage.
 *
 * Deux comptes, parce que l'isolation est la propriete la plus facile a casser
 * en silence : un `delete` mal filtre rouvrirait les notices de tout le monde,
 * et personne ne s'en apercevrait avant longtemps.
 */
const PREMIER = `notes-un-${randomUUID().slice(0, 8)}@test.local`
const SECOND = `notes-deux-${randomUUID().slice(0, 8)}@test.local`

const CARTE = /La liste de tout ce que vous avez établi/

test('les notices d’ecran', async ({ page, browser }) => {
  await signIn(page, PREMIER)
  await quoteFor(PREMIER, 'draft')

  await test.step('elle se presente a la premiere visite', async () => {
    await page.goto('/devis')
    await expect(page.getByText(CARTE)).toBeVisible()
  })

  await test.step('refermee, elle ne revient pas — meme sur un autre appareil', async () => {
    await page.getByRole('button', { name: 'Fermer' }).first().click()
    await expect(page.getByText(CARTE)).toHaveCount(0)

    // Un rechargement ne prouverait que le serveur. Un contexte neuf prouve
    // que rien ne tenait dans le navigateur.
    const ailleurs = await browser.newContext()
    const surLeChantier = await ailleurs.newPage()
    await signIn(surLeChantier, PREMIER)
    await surLeChantier.goto('/devis')

    await expect(surLeChantier.getByText(CARTE)).toHaveCount(0)
    await ailleurs.close()
  })

  await test.step('un autre compte garde les siennes', async () => {
    // Le rejet est filtre sur la personne, en SQL. Sans ce filtre, fermer une
    // carte les fermerait pour tout le monde.
    const chezLui = await browser.newContext()
    const autre = await chezLui.newPage()
    await signIn(autre, SECOND)
    await quoteFor(SECOND, 'draft')
    await autre.goto('/devis')

    await expect(autre.getByText(CARTE)).toBeVisible()
    await chezLui.close()
  })

  await test.step('« Revoir les explications » les fait revenir', async () => {
    // Pas de rechargement : `refresh()` refait le rendu de la route courante,
    // et c'est precisement ce qu'on veut eprouver. Un `goto` masquerait une
    // action qui n'aurait rien rafraichi du tout.
    await page.getByRole('button', { name: 'Revoir les explications' }).click()

    await expect(page.getByText(CARTE)).toBeVisible()
  })

  await test.step('le vide enseigne, sans inventer de chiffre', async () => {
    // Aucune donnee fictive n'entre en base (spec §2.2) : le devis d'exemple
    // est une illustration, et ses montants sont des barres, pas des nombres.
    const neuf = await browser.newContext()
    const sansDevis = await neuf.newPage()
    const vide = `notes-vide-${randomUUID().slice(0, 8)}@test.local`

    await signIn(sansDevis, vide)
    // Une entreprise, mais aucun devis : sans entreprise, `/devis` renverrait
    // a la porte d'inscription et il n'y aurait aucun vide a montrer.
    await companyWithActivities(vide, ['30'])
    await sansDevis.goto('/devis')

    await expect(sansDevis.getByText('Exemple')).toBeVisible()
    await neuf.close()
  })
})
