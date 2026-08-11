import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor, mailboxHasFor, signIn } from './helpers'
import { accountExists } from './fixtures-db'

/**
 * Le parcours d'A1 : les deux portes d'inscription, la porte de retour, la
 * sortie, et le refus du back-office.
 *
 * **Un contexte par personne.** Le verificateur PKCE du lien magique vit dans
 * les cookies du contexte qui l'a demande, et la session qui en sort ecraserait
 * celle du precedent. C'est aussi plus fidele : ces gens-la ne partagent pas un
 * navigateur.
 *
 * Adresses neuves a chaque lancement : le parcours cree des comptes, et des
 * adresses reutilisees les feraient s'accumuler.
 */
const ARTISAN = `artisan-a1-${randomUUID().slice(0, 8)}@test.local`
const PARTICULIER = `client-a1-${randomUUID().slice(0, 8)}@test.local`
const INCONNU = `personne-a1-${randomUUID().slice(0, 8)}@test.local`
const CURIEUX = `curieux-a1-${randomUUID().slice(0, 8)}@test.local`

/**
 * SIRET reel et actif : l'API Recherche d'Entreprises est appelee pour de vrai,
 * comme dans quote-journey. Un SIRET invente ferait echouer la recherche.
 *
 * Distinct de celui du jeu de donnees et de celui de quote-journey : l'etape du
 * refus compte sur le fait que c'est CE parcours qui vient de le prendre.
 */
const SIRET = '55208131766522'
const RAISON_SOCIALE = /ELECTRICITE DE FRANCE/i

test('les portes', async ({ page, browser }) => {
  await clearMailbox()

  // Le visiteur anonyme, celui qui arrive de la landing. Le compte deja
  // connecte emprunte l'autre branche de la meme page — quote-journey la
  // parcourt, et la redoubler ici ne prouverait rien de neuf.
  await test.step('l’artisan voit l’en-tête de ses futurs devis AVANT de donner son adresse', async () => {
    await page.goto('/creer-mon-entreprise')
    await expect(page.getByText('Étape 1 sur 3')).toBeVisible()

    await page.getByLabel('SIRET').fill(SIRET)
    await page.getByRole('button', { name: 'Continuer' }).click()

    await expect(page.getByText('Étape 2 sur 3')).toBeVisible()
    // L'element signature : sa raison sociale, qu'il n'a pas saisie.
    await expect(page.getByText(RAISON_SOCIALE)).toBeVisible()
    // Et le travail restant, annonce avant l'engagement.
    await expect(page.getByText('Assurance décennale')).toBeVisible()
    await expect(page.getByText('à compléter').first()).toBeVisible()
  })

  await test.step('revenir en arrière ne fait pas retaper les 14 chiffres', async () => {
    await page.getByRole('button', { name: 'Ce n’est pas la bonne' }).click()

    await expect(page.getByText('Étape 1 sur 3')).toBeVisible()
    await expect(page.getByLabel('SIRET')).toHaveValue(SIRET)

    // On repart en avant pour la suite du parcours.
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.getByRole('button', { name: 'C’est bien mon entreprise' }).click()
    await expect(page.getByText('Étape 3 sur 3')).toBeVisible()
  })

  await test.step('puis reçoit son lien, et son entreprise est créée à l’ouverture', async () => {
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir mon lien' }).click()

    // L'ecran d'attente est un ecran, pas un encadre vert.
    await expect(page.getByText(`Un lien part vers ${ARTISAN}`)).toBeVisible()
    await expect(page.getByRole('button', { name: /Renvoyer dans 0:/ })).toBeDisabled()

    await page.goto(await magicLinkFor(ARTISAN))

    // L'accueil, et sa navigation : l'intention gardee de cote a bien produit
    // une entreprise. La seule URL ne prouverait rien — la racine sert aussi la
    // landing au visiteur, et l'on y arrive donc meme sans compte.
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  })

  await test.step('il peut sortir', async () => {
    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL('/')
    // La racine sert de nouveau la landing : plus de navigation d'espace connecte.
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)

    // La session est bien morte : l'atelier renvoie a la porte de retour.
    await page.goto('/devis')
    await expect(page).toHaveURL(/\/connexion/)
  })

  await test.step('le particulier s’inscrit seul et atterrit sur son répertoire', async () => {
    const chezLui = await browser.newContext()
    const client = await chezLui.newPage()

    await client.goto('/creer-mon-compte')
    await client.getByLabel('Votre nom').fill('Paul Martin')
    await client.getByLabel('E-mail').fill(PARTICULIER)
    await client.getByRole('button', { name: 'Créer mon compte' }).click()
    await client.goto(await magicLinkFor(PARTICULIER))

    // Pas /mes-logements : il n'a jamais signe, l'ecran serait vide et
    // structurellement incapable de se remplir.
    await expect(client).toHaveURL(/\/mon-repertoire/)

    await chezLui.close()
  })

  await test.step('une entreprise déjà inscrite est refusée AVANT toute adresse', async () => {
    // Le meme SIRET qu'a la premiere etape : l'entreprise existe maintenant.
    // Le refus doit tomber a l'ecran du SIRET, donc avant qu'aucune adresse
    // n'ait ete demandee — c'etait la principale fabrique d'orphelins.
    const ailleurs = await browser.newContext()
    const second = await ailleurs.newPage()

    await second.goto('/creer-mon-entreprise')
    await second.getByLabel('SIRET').fill(SIRET)
    await second.getByRole('button', { name: 'Continuer' }).click()

    await expect(second.getByText('déjà inscrite')).toBeVisible()
    // On reste a l'etape 1 : aucun compte n'a pu naitre.
    await expect(second.getByText('Étape 2 sur 3')).toHaveCount(0)

    await ailleurs.close()
  })

  await test.step('une adresse inconnue ne reçoit rien, et ne l’apprend pas', async () => {
    const dehors = await browser.newContext()
    const visiteur = await dehors.newPage()

    await visiteur.goto('/connexion')
    await visiteur.getByLabel('E-mail').fill(INCONNU)
    await visiteur.getByRole('button', { name: 'Recevoir le lien' }).click()

    // Le meme message que pour une adresse connue.
    await expect(visiteur.getByRole('status')).toContainText('Si un compte existe')
    expect(await mailboxHasFor(INCONNU)).toBe(false)

    // Et surtout : AUCUN compte n'a ete cree. C'est la raison d'etre de
    // `shouldCreateUser: false` ; le message seul ne la prouverait pas.
    expect(await accountExists(INCONNU)).toBe(false)

    await dehors.close()
  })

  await test.step('un compte sans rôle interne n’atteint pas le back-office', async () => {
    const alentour = await browser.newContext()
    const curieux = await alentour.newPage()

    // `signIn` cree le compte elle-meme : sans entreprise, sans dossier et sans
    // role interne, c'est le profil le plus nu qui puisse frapper a la porte.
    await signIn(curieux, CURIEUX)
    await curieux.goto('/supervision')

    // `notFound`, pas une redirection : il n'apprend meme pas que l'adresse
    // existe.
    await expect(curieux.getByText('404')).toBeVisible()

    await alentour.close()
  })
})
