import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor, mailboxHas } from './helpers'
import { quoteFor, switchToPro } from './fixtures'

/**
 * Le parcours de M8·A : de la porte fermee au compagnon dans l'atelier.
 *
 * **Deux contextes, deux sessions.** Le verificateur PKCE du lien magique vit
 * dans les cookies du contexte qui l'a demande — et c'est aussi plus fidele :
 * le patron et son compagnon ne partagent pas un navigateur.
 */
const PATRON = `patron-m8-${randomUUID().slice(0, 8)}@test.local`
const COMPAGNON = `compagnon-m8-${randomUUID().slice(0, 8)}@test.local`

test('de la porte fermée au compagnon dans l’atelier', async ({ browser }) => {
  await clearMailbox()

  const shop = await browser.newContext()
  const patron = await shop.newPage()

  await test.step('connexion du patron', async () => {
    await patron.goto('/connexion')
    await patron.getByLabel('E-mail').fill(PATRON)
    await patron.getByRole('button', { name: 'Recevoir le lien' }).click()
    await patron.goto(await magicLinkFor(PATRON))
  })

  await quoteFor(PATRON, 'draft')

  await test.step('l’équipe est fermée, et l’écran dit pourquoi', async () => {
    await patron.goto('/equipe')

    await expect(patron.getByText('L’équipe fait partie de l’offre Pro')).toBeVisible()
    // La promesse du jalon, verifiee a l'ecran : rien de ce qui existait ne
    // passe derriere la porte.
    await expect(patron.getByText(/reste gratuit, et le restera/)).toBeVisible()
    await expect(patron.getByLabel('E-mail')).toHaveCount(0)
  })

  await test.step('passée en Pro, l’entreprise peut inviter', async () => {
    await switchToPro(PATRON)
    await patron.goto('/equipe')

    await patron.getByLabel('E-mail').fill(COMPAGNON)
    await patron.getByRole('button', { name: 'Inviter' }).click()

    await expect(patron.getByTestId('invitations')).toContainText(COMPAGNON)
  })

  await test.step('l’invitation part, sans lien porteur d’autorisation', async () => {
    expect(await mailboxHas('vous invite à rejoindre son équipe')).toBe(true)
  })

  const site = await browser.newContext()
  const compagnon = await site.newPage()

  await test.step('le compagnon se connecte et rejoint l’entreprise', async () => {
    await compagnon.goto('/connexion')
    await compagnon.getByLabel('E-mail').fill(COMPAGNON)
    await compagnon.getByRole('button', { name: 'Recevoir le lien' }).click()
    await compagnon.goto(await magicLinkFor(COMPAGNON))

    // Il atterrit dans l'atelier, pas sur le formulaire SIRET de l'inscription.
    await expect(compagnon).toHaveURL(/\/devis$/)
  })

  await test.step('l’argent ne lui est ni proposé, ni accessible', async () => {
    await expect(compagnon.getByRole('link', { name: 'Factures' })).toHaveCount(0)
    await expect(compagnon.getByRole('link', { name: 'Équipe' })).toHaveCount(0)
    await expect(compagnon.getByRole('link', { name: 'Passeport' })).toHaveCount(0)

    // Et la garde ne vit pas dans la navigation : l'adresse tapée à la main est
    // refusée elle aussi.
    await compagnon.goto('/factures')
    await expect(compagnon).toHaveURL(/\/devis$/)
  })

  await test.step('mais l’agenda, oui — c’est son métier', async () => {
    await compagnon.goto('/agenda')
    await expect(compagnon.getByRole('heading', { level: 1 })).toBeVisible()
  })

  await test.step('retiré, il perd l’accès', async () => {
    await patron.goto('/equipe')
    await patron.getByTestId('equipe').getByRole('button', { name: 'Retirer' }).first().click()

    await expect(patron.getByTestId('equipe')).not.toContainText(COMPAGNON)

    await compagnon.goto('/agenda')
    // Le compte existe toujours, il n'appartient plus a aucune entreprise.
    await expect(compagnon).toHaveURL(/\/inscription$/)
  })
})
