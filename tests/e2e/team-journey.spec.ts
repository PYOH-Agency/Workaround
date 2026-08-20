import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor, mailboxHas, signIn } from './helpers'
import { accountExists } from './fixtures-db'
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
/** Celui qui n'a JAMAIS eu de compte. Il n'ira pas par `signIn`. */
const NOUVEAU = `nouveau-m8-${randomUUID().slice(0, 8)}@test.local`

test('de la porte fermée au compagnon dans l’atelier', async ({ browser }) => {
  await clearMailbox()

  const shop = await browser.newContext()
  const patron = await shop.newPage()

  await test.step('connexion du patron', async () => {
    await signIn(patron, PATRON)
  })

  await quoteFor(PATRON, 'draft')

  await test.step('l’équipe est fermée, et l’écran dit pourquoi', async () => {
    await patron.goto('/equipe')

    await expect(patron.getByText('L’équipe fait partie de l’offre Pro')).toBeVisible()
    // La promesse du jalon, verifiee a l'ecran : rien de ce qui existait ne
    // passe derriere la porte.
    await expect(patron.getByText(/reste gratuit, et le restera/)).toBeVisible()
    await expect(patron.getByLabel('E-mail')).toHaveCount(0)

    /*
      La seule surface payante du produit doit avoir une porte.

      Elle a ete livree avec `action={null}` : « Ecrivez-nous », et rien a
      cliquer. Un cul-de-sac sur cet ecran-la ne coute pas une friction, il
      coute la vente — d'ou une assertion plutot qu'une relecture.

      La porte a change de nature, pas de raison d'etre : c'etait un `mailto`,
      c'est desormais un ecran dedie qui porte la demande. L'assertion suit —
      ce qu'elle garde, c'est qu'il y ait quelque chose a cliquer.
    */
    const enquiry = patron.getByRole('link', { name: 'Découvrir l’offre Pro' })
    await expect(enquiry).toBeVisible()
    expect(await enquiry.getAttribute('href')).toBe('/offre-pro')

    // Et que cette porte-la ne soit pas elle-meme un cul-de-sac : l'ecran
    // dedie porte le geste, pas seulement l'argumentaire.
    await enquiry.click()
    await expect(patron.getByRole('button', { name: 'Demander l’activation' })).toBeVisible()
    await patron.goto('/equipe')
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
    await signIn(compagnon, COMPAGNON)

    // Il atterrit dans l'espace connecte de l'entreprise, pas sur le
    // formulaire SIRET de l'inscription. La destination d'un compte avec
    // entreprise est desormais l'accueil — `resolveDestination` renvoie `/`
    // pour quiconque a une entreprise, compagnon compris — donc c'est la
    // navigation de l'atelier, et non plus `/devis`, qui atteste qu'il est
    // bien arrive chez lui.
    await expect(compagnon).toHaveURL(/\/$/)
    await expect(compagnon.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
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
    await expect(compagnon).toHaveURL(/\/creer-mon-entreprise$/)
  })

  await test.step('un invité qui n’a JAMAIS eu de compte entre quand même', async () => {
    // Le cas que les autres parcours masquaient : leur aide `signIn` cree le
    // compte avant de frapper a la porte. Or `/connexion` n'envoie plus rien a
    // une adresse inconnue, et l'invite n'a AUCUNE autre porte — celle de
    // l'artisan lui ferait creer une entreprise concurrente.
    await patron.goto('/equipe')
    await patron.getByLabel('E-mail').fill(NOUVEAU)
    await patron.getByRole('button', { name: 'Inviter' }).click()
    await expect(patron.getByTestId('invitations')).toContainText(NOUVEAU)

    expect(await accountExists(NOUVEAU)).toBe(false)

    const ailleurs = await browser.newContext()
    const nouveau = await ailleurs.newPage()

    await nouveau.goto('/connexion')
    await nouveau.getByLabel('E-mail').fill(NOUVEAU)
    await nouveau.getByRole('button', { name: 'Recevoir le lien' }).click()
    await nouveau.goto(await magicLinkFor(NOUVEAU))

    // L'espace connecte de l'entreprise qui l'a invite, et sa navigation : la
    // seule URL laisserait croire qu'il suffit d'y arriver.
    await expect(nouveau).toHaveURL(/\/$/)
    await expect(
      nouveau.getByRole('navigation', { name: 'Navigation principale' }),
    ).toBeVisible()

    await ailleurs.close()
  })
})
