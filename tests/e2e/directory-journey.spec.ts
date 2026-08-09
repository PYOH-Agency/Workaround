import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'
import { coveredCompany } from './fixtures-directory'

/**
 * Le parcours de M4 : un demandeur trouve un artisan et le contacte.
 *
 * Il n'a pas de compte, et n'en aura pas : tout se fait sans session.
 */
const ARTISAN = 'artisan-m4@test.local'

test('de la recherche a la demande recue', async ({ browser }) => {
  await clearMailbox()

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill(ARTISAN)
  await page.getByRole('button', { name: 'Recevoir le lien' }).click()
  await page.goto(await magicLinkFor(ARTISAN))

  // Declaree en plomberie ET en electricite, couverte en plomberie seulement.
  const company = await coveredCompany(ARTISAN, { declared: ['30', '34'], covered: ['30'] })

  const visitor = await browser.newContext()
  const demandeur = await visitor.newPage()

  await test.step('le demandeur cherche par besoin, pas par jargon', async () => {
    await demandeur.goto('/annuaire')
    await demandeur.getByLabel('Votre besoin').selectOption('fuite-eau')
    await demandeur.getByLabel('Où').fill('33000')
    await demandeur.getByRole('button', { name: 'Chercher' }).click()

    await expect(demandeur.getByText(company.legalName)).toBeVisible()
  })

  await test.step('une activite declaree mais non couverte ne remonte pas', async () => {
    // La regle du jalon, vue du demandeur.
    await demandeur.goto('/annuaire?besoin=refaire-electricite&zone=33000')
    await expect(demandeur.getByText(company.legalName)).toHaveCount(0)
  })

  await test.step('il ouvre la fiche et envoie une demande', async () => {
    await demandeur.goto(`/artisan/${company.slug}`)

    await demandeur.getByLabel('Votre nom').fill('Paul Martin')
    await demandeur.getByLabel('Votre e-mail').fill('paul-m4@test.local')
    await demandeur.getByLabel('Votre téléphone').fill('0790112233')
    await demandeur.getByLabel('Votre besoin').fill('Ma chaudière fuit depuis hier.')
    await demandeur.getByRole('button', { name: 'Envoyer la demande' }).click()

    await expect(demandeur.getByRole('status')).toContainText('répondra directement')
  })

  await test.step('la fiche reste lisible sous preference systeme sombre', async () => {
    /*
      Le defaut que cette etape ferme : `PublicShell` force le clair sur une
      `div`, mais le `text-ink` du `<body>` — au-dessus de cette div — se
      resolvait, lui, avec les variables sombres. Tout element sans classe de
      couleur heritait donc d'une encre claire, et le libelle d'activite
      s'affichait en #F5F1E8 sur #F5F1E8. Invisible, et vu comme « visible » par
      Playwright, qui juge la mise en page et non le contraste.
    */
    const dark = await browser.newContext({ colorScheme: 'dark' })
    const reader = await dark.newPage()
    await reader.goto(`/artisan/${company.slug}`)

    const ratio = await reader.locator('[data-testid^="activite-"]').first().evaluate((el) => {
      const relative = (color: string) => {
        const [r, g, b] = color.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((v) => {
          const c = Number(v) / 255
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }

      let node: HTMLElement | null = el as HTMLElement
      let background = 'rgba(0, 0, 0, 0)'
      while (node && background === 'rgba(0, 0, 0, 0)') {
        background = getComputedStyle(node).backgroundColor
        node = node.parentElement
      }

      const text = relative(getComputedStyle(el).color)
      const surface = relative(background)
      return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05)
    })

    expect(ratio).toBeGreaterThanOrEqual(4.5)
    await dark.close()
  })

  // Le numero et l'adresse ci-dessus n'existent nulle part ailleurs dans le jeu
  // de donnees : c'est ce qui rend le balayage de l'etape suivante sans
  // ambiguite. Un temoin partage avec les fixtures obligerait a interpreter.
  await test.step('l artisan recoit la demande par courriel', async () => {
    const inbox = await fetch('http://127.0.0.1:54324/api/v1/messages?limit=20')
    const { messages } = (await inbox.json()) as { messages: { Subject: string }[] }

    expect(messages.some((m) => m.Subject.includes('Demande reçue'))).toBe(true)
  })

  await context.close()
  await visitor.close()
})
