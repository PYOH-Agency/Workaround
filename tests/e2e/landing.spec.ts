import { test, expect, type Page } from '@playwright/test'

/**
 * Les invariantes des deux pages d'accroche.
 *
 * Aucun test unitaire ne peut les voir : elles naissent de la rencontre entre
 * une feuille de style, un observateur d'intersection et une preference du
 * navigateur. Le mouvement de cette landing s'est deja efface deux fois — une
 * fois par un `display: contents` qui ne generait aucune boite a observer, une
 * fois par un enrobage qui ne portait plus la cadence. Les deux fois, le
 * contenu etait invisible et rien ne le signalait.
 *
 * D'ou la forme de ces assertions : elles ne verifient pas que ca bouge, mais
 * que ca se voit.
 */
const PAGES = ['/', '/verifier']

/** Tout ce que le regime de mouvement peut rendre invisible. */
const ANIMATED = '[data-reveal], [data-reveal-tick], [data-stagger] > *'

async function everythingVisible(page: Page) {
  return page.evaluate((selector) => {
    const elements = [...document.querySelectorAll(selector)]
    return {
      total: elements.length,
      faded: elements.filter((element) => Number(getComputedStyle(element).opacity) < 0.99).length,
    }
  }, ANIMATED)
}

for (const path of PAGES) {
  test(`${path} — le contenu apparait`, async ({ page }) => {
    await page.goto(path)
    // Les elements hors de l'ecran n'ont pas encore ete observes : on ne juge
    // que l'accroche, qui est visible des le chargement.
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-reveal]').first()).toHaveCSS('opacity', '1')
  })

  test(`${path} — « réduire les animations » n'efface rien`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto(path)

    const { total, faded } = await everythingVisible(page)
    expect(total).toBeGreaterThan(0)
    expect(faded).toBe(0)

    await context.close()
  })

  test(`${path} — sans JavaScript, la page reste lisible`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(path)

    // Sans script, `.dq-motion` n'est jamais posee : l'etat initial masquant
    // n'existe pas. C'est la garantie ecrite en tete de `motion.css`.
    await expect(page.locator('html')).not.toHaveClass(/dq-motion/)
    const { total, faded } = await everythingVisible(page)
    expect(total).toBeGreaterThan(0)
    expect(faded).toBe(0)

    await context.close()
  })

  test(`${path} — le mode clair tient malgre la preference sombre`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()
    await page.goto(path)

    // `LandingShell` force le mode clair : une accroche doit avoir la meme tete
    // pour tout le monde, et sa capture d'ecran doit ressembler a ce qu'on voit.
    await expect(page.locator('[data-theme="light"]').first()).toHaveCSS(
      'background-color',
      'rgb(245, 241, 232)',
    )

    await context.close()
  })

  test(`${path} — rien ne deborde sur un telephone`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const page = await context.newPage()
    await page.goto(path)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)

    await context.close()
  })
}

test('la verification d’un SIRET inconnu ne dit pas pourquoi', async ({ page }) => {
  await page.goto('/verifier')

  /*
    SIRET valide au sens de Luhn, absent de la base : la reponse doit etre la
    meme que pour une entreprise connue mais non publiee.

    Le SIREN 999 999 999 est choisi parce qu'il ne peut appartenir a personne.
    Le test utilisait auparavant celui du seed, absent de la page publique
    seulement parce qu'aucune attestation ne l'y publiait : le jour ou le seed
    lui en a donne une, le test s'est mis a echouer sur une premisse devenue
    fausse, sans que rien du produit n'ait bouge.
  */
  await page.getByLabel('SIRET de l’entreprise').fill('99999999900009')
  await page.getByRole('button', { name: 'Vérifier' }).click()

  await expect(
    page.getByText('Cette entreprise n’a pas encore de page publique sur D’équerre.'),
  ).toBeVisible()
})

test('le renvoi de lien ne revele pas l’existence d’un devis', async ({ page }) => {
  await page.goto('/verifier')

  await page.getByLabel('Votre adresse e-mail').fill('personne-sans-devis@test.local')
  await page.getByRole('button', { name: 'Recevoir le lien' }).click()

  await expect(
    page.getByText('Si un devis a été envoyé à cette adresse, vous allez le recevoir.'),
  ).toBeVisible()
})
