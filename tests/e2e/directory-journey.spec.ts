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
